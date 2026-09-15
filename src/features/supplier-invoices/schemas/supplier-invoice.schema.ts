import { z } from "zod";
import {
  MONEY_REGEX,
  toCents,
} from "@/src/features/accounts-receivable/schemas/register-pending-invoice.schema";

/**
 * Esquema del formulario de alta de facturas de proveedor.
 *
 * Valida los VALORES DEL FORMULARIO, no el payload: la cabecera arrastra datos
 * de la OC y la recepción elegidas (folios, nombre del proveedor, código de
 * moneda, la tasa de IVA) y cada renglón arrastra los de su recepción (lo
 * recibido, lo ya facturado) que NO viajan al API pero que la vista necesita
 * para pintar y el `superRefine` para validar topes. El mapeo al cuerpo del API
 * vive en `utils/buildSupplierInvoicePayload.ts`.
 *
 * `MONEY_REGEX`/`toCents` se reutilizan de CxC: son la fuente de verdad del
 * proyecto para dinero de 2 decimales y comparación en centavos enteros.
 *
 * ─── EL BACKEND NO VALIDA NINGÚN IMPORTE ─────────────────────────────────────
 *
 * No exige que la cabecera cuadre con los renglones, ni que
 * `total = subtotal − descuento + impuestos`, ni cruza los precios contra la OC.
 * Guarda lo que llega y, al registrar, la CxP copia el `total` tal cual. Por eso
 * esta capa NO expone los importes de cabecera como captura libre: se DERIVAN de
 * los renglones (ver `calcularTotales`), de modo que el total que se paga sea
 * por construcción la suma de lo facturado.
 *
 * ─── QUÉ REGLA DEPENDE DE LA INTENCIÓN Y CUÁL NO ─────────────────────────────
 *
 * `estatus_objetivo` es la intención del botón pulsado (mismo mecanismo que en
 * pólizas y notas de crédito). Pero aquí SOLO `fecha_vencimiento` se relaja en el
 * borrador, y es a propósito:
 *
 *  - `fecha_vencimiento` se puede corregir después con un PATCH de cabecera, así
 *    que un borrador sin ella es un documento a medio capturar legítimo. Se exige
 *    al REGISTRAR, porque una CxP sin vencimiento nunca aparece como vencida.
 *  - Los renglones (cantidades, precios, descuentos) y la tasa de IVA NO se
 *    relajan en el borrador: `factura_proveedor_detalles` es de escritura SOLO EN
 *    EL ALTA, así que un borrador guardado con un precio en cero o sin renglones
 *    quedaría así PARA SIEMPRE — ningún PATCH podría arreglarlo, y registrarlo
 *    después generaría una CxP con ese total. Una regla sobre datos inmutables
 *    tiene que cumplirse desde el primer guardado.
 */

// ─── Aritmética en enteros ────────────────────────────────────────────────────

/** Cantidad con hasta 4 decimales (la precisión de `cantidad_recibida`). */
const QTY4_REGEX = /^\d+(\.\d{1,4})?$/;

/**
 * Cantidad en string → DIEZMILÉSIMAS enteras ("10.1250" → 101250), o `null` si
 * no es una cantidad. Se compara en enteros por el mismo motivo que el dinero en
 * centavos: en flotantes, `10.1 * 10000` no es exactamente `101000`.
 */
export const qtyToUnits = (value: string): number | null => {
  const trimmed = value.trim();
  if (!QTY4_REGEX.test(trimmed)) return null;
  const [intPart, fracPart = ""] = trimmed.split(".");
  return Number(intPart) * 10000 + Number(fracPart.padEnd(4, "0"));
};

/** Diezmilésimas enteras → string decimal sin ceros sobrantes (101250 → "10.125"). */
export const unitsToQty = (units: number): string => {
  const intPart = Math.floor(units / 10000);
  const frac = String(units % 10000).padStart(4, "0").replace(/0+$/, "");
  return frac ? `${intPart}.${frac}` : String(intPart);
};

/**
 * ¿La cantidad tiene decimales SIGNIFICATIVOS más allá del segundo?
 * "10.1200" → no (se representa como "10.12"); "10.1250" → sí.
 */
export const tieneMasDeDosDecimales = (units: number): boolean => units % 100 !== 0;

/** Quita el punto de un valor a medio teclear ("12." → "12"). Mismo criterio que pólizas. */
const sinPuntoFinal = (value: string): string =>
  /^\d+\.$/.test(value) ? value.slice(0, -1) : value;

/** Dinero de captura → centavos enteros, o `null` si no es dinero. Vacío vale 0. */
export const importeACentavos = (raw: string): number | null => {
  const value = sinPuntoFinal(raw.trim());
  if (value === "") return 0;
  if (!MONEY_REGEX.test(value)) return null;
  return toCents(value);
};

/** Centavos enteros → string decimal de 2 posiciones (116000 → "1160.00"). */
export const centavosAMoneda = (cents: number): string => (cents / 100).toFixed(2);

/** Tasa de IVA en porcentaje con hasta 2 decimales ("16", "16.00", "8.5"). */
const TASA_REGEX = /^\d{1,3}(\.\d{1,2})?$/;

/** Tasa → centésimas de punto porcentual enteras ("16.00" → 1600), o `null`. */
export const tasaACentesimas = (raw: string): number | null => {
  const value = sinPuntoFinal(raw.trim());
  if (!TASA_REGEX.test(value)) return null;
  const cents = toCents(value);
  return cents <= 10000 ? cents : null;
};

// ─── Cálculo de importes ──────────────────────────────────────────────────────

export interface ImportesLinea {
  /** `cantidad × precio_unitario`, antes del descuento. */
  brutoCents: number;
  descuentoCents: number;
  /** `bruto − descuento`. Es el `subtotal` del RENGLÓN (convención del importe de la OC). */
  subtotalCents: number;
  impuestoCents: number;
  /** `subtotal + impuesto`. */
  totalCents: number;
}

/**
 * Importes de UN renglón, en centavos enteros, o `null` si algún dato de captura
 * no es válido (su campo ya reporta el error; con NaN no hay nada que sumar).
 *
 * Convenciones, tomadas del backend de compras y no inventadas:
 *  - `descuento` es un IMPORTE del renglón, no un porcentaje: la OC calcula
 *    `importe = cantidad × precio − descuento` (`compras/api/views.py`).
 *  - `impuesto = subtotal × tasa / 100`: la misma fórmula con la que la OC
 *    obtiene `total_iva` de `porcentaje_iva`.
 *
 * El redondeo a centavo es `Math.round` sobre enteros positivos (mitad hacia
 * arriba). El producto `cantidad × precio` se hace en enteros —centésimas de
 * pieza × centavos— y se divide una sola vez al final.
 */
export const calcularImportesLinea = (
  line: Pick<SupplierInvoiceLineFormValues, "cantidad" | "precio_unitario" | "descuento">,
  tasaIva: string,
): ImportesLinea | null => {
  const cantidadUnits = qtyToUnits(sinPuntoFinal(line.cantidad));
  const precioCents = importeACentavos(line.precio_unitario);
  const descuentoCents = importeACentavos(line.descuento);
  const tasa = tasaACentesimas(tasaIva);
  if (
    cantidadUnits === null ||
    tieneMasDeDosDecimales(cantidadUnits) ||
    precioCents === null ||
    descuentoCents === null ||
    tasa === null
  ) {
    return null;
  }
  // cantidad en centésimas (units / 100) × precio en centavos → centavos × 100.
  const brutoCents = Math.round(((cantidadUnits / 100) * precioCents) / 100);
  const subtotalCents = brutoCents - descuentoCents;
  const impuestoCents = Math.round((subtotalCents * tasa) / 10000);
  return {
    brutoCents,
    descuentoCents,
    subtotalCents,
    impuestoCents,
    totalCents: subtotalCents + impuestoCents,
  };
};

export interface TotalesFactura {
  /** Σ bruto de los renglones — el `subtotal` de CABECERA, antes de descuentos. */
  subtotalCents: number;
  descuentoCents: number;
  impuestosCents: number;
  /** `subtotal − descuento + impuestos` = Σ `total` de los renglones. */
  totalCents: number;
  /** `false` si algún renglón tiene datos inválidos: las sumas están incompletas. */
  completo: boolean;
}

/**
 * Totales de CABECERA derivados de los renglones. Definición ÚNICA: la usan el
 * resumen en vivo de la vista y `buildSupplierInvoicePayload`, de modo que lo que
 * el usuario ve y lo que viaja al API —y lo que la CxP copiará— no puedan
 * discrepar.
 *
 * La cabecera sigue la identidad del resto de facturas del proyecto
 * (`total = subtotal − descuento + impuestos`, la que valida el alta de CxC
 * pendiente): por eso su `subtotal` es el BRUTO, mientras que el `subtotal` de
 * cada renglón ya viene neto de su descuento. Ambas convenciones suman al mismo
 * `total`.
 */
export const calcularTotales = (
  lines: SupplierInvoiceLineFormValues[],
  tasaIva: string,
): TotalesFactura => {
  const totales: TotalesFactura = {
    subtotalCents: 0,
    descuentoCents: 0,
    impuestosCents: 0,
    totalCents: 0,
    completo: true,
  };
  for (const line of lines) {
    const importes = calcularImportesLinea(line, tasaIva);
    if (!importes) {
      totales.completo = false;
      continue;
    }
    totales.subtotalCents += importes.brutoCents;
    totales.descuentoCents += importes.descuentoCents;
    totales.impuestosCents += importes.impuestoCents;
    totales.totalCents += importes.totalCents;
  }
  return totales;
};

// ─── Esquemas ─────────────────────────────────────────────────────────────────

const MONEY_MESSAGE = "Importe inválido (usa hasta 2 decimales)";

/**
 * Aviso de captura manual del descuento. Único: lo pinta la tarjeta del renglón
 * y lo usa el error de validación cuando el campo se deja vacío.
 */
export const DESCUENTO_MANUAL_AVISO =
  "El descuento de la orden de compra no se pudo aplicar automáticamente a esta partida. Captúralo manualmente (escribe 0 si no aplica).";

const DESCUENTO_MANUAL_MESSAGE = "Captura el descuento de esta partida (0 si no aplica)";

/**
 * Reglas de cabecera que se exigen al REGISTRAR, compartidas por el alta y la
 * edición de un borrador (y por una futura acción de fila "Registrar"), para que
 * los tres caminos digan exactamente lo mismo.
 */
export const FECHA_VENCIMIENTO_REQUERIDA_MESSAGE =
  "La fecha de vencimiento es requerida para registrar: la cuenta por pagar la copia, y sin ella nunca aparecería como vencida.";

const registrarRefine = (fechaVencimiento: string, ctx: z.RefinementCtx) => {
  if (fechaVencimiento.trim() === "") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: FECHA_VENCIMIENTO_REQUERIDA_MESSAGE,
      path: ["fecha_vencimiento"],
    });
  }
};

/** Dinero de captura: el vacío y el punto colgante se normalizan antes de validar. */
const money = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = sinPuntoFinal(value.trim());
  return normalized === "" ? "0.00" : normalized;
}, z.string().regex(MONEY_REGEX, MONEY_MESSAGE));

/**
 * Renglón de la factura: un renglón de la recepción, cruzado con su renglón de
 * OC.
 *
 * `recepcion_detalle`, `oc_detalle` y `producto` los siembra el selector y no se
 * editan. `cantidad_recibida` y `cantidad_facturada_previa` viajan solo para
 * validar el tope; `producto_nombre` y `precio_oc_oculto`, solo para pintar.
 */
export const SupplierInvoiceLineFormSchema = z
  .object({
    /** FK al `RecepcionDetalle`. Lo fija el selector. */
    recepcion_detalle: z.number().int().positive(),
    /** FK al `OrdenCompraDetalle` con el que se cruzó el renglón de recepción. */
    oc_detalle: z.number().int().positive(),
    /** FK al producto. El backend exige que coincida con el de ambos detalles. */
    producto: z.number().int().positive(),
    producto_nombre: z.string(),
    /** Lo recibido en la recepción, tal cual llega (4 decimales). */
    cantidad_recibida: z.string(),
    /** Lo ya facturado de este renglón en facturas NO canceladas (4 decimales). */
    cantidad_facturada_previa: z.string(),
    /**
     * `true` si la OC llegó SIN `precio` —el backend lo elimina de la respuesta
     * para usuarios sin rol financiero—, y por tanto el precio se capturó a mano.
     */
    precio_oc_oculto: z.boolean(),
    /**
     * Normalizada (sin espacios ni punto colgante) ANTES del `superRefine`, para
     * que el valor que sale de `safeParse` —el que usa
     * `buildSupplierInvoicePayload`— sea el mismo que se validó.
     */
    cantidad: z.preprocess(
      (value) => (typeof value === "string" ? sinPuntoFinal(value.trim()) : value),
      z.string(),
    ),
    precio_unitario: money,
    /**
     * `true` si el descuento de la OC NO se pudo aplicar automáticamente —era
     * distinto de cero, o el renglón de OC no cuadraba— y debe capturarse a mano
     * (ver `requiereDescuentoManual`). Solo para pintar el aviso y exigir la
     * captura; no viaja al API.
     */
    descuento_manual_requerido: z.boolean(),
    /**
     * A diferencia de `precio_unitario`, el vacío NO se convierte en "0.00" antes
     * de validar: un renglón que exige captura manual tiene que poder distinguir
     * "no capturado" de un 0 explícito. En los demás renglones el vacío vale 0
     * (`importeACentavos`), igual que antes.
     */
    descuento: z.preprocess(
      (value) => (typeof value === "string" ? sinPuntoFinal(value.trim()) : value),
      z.string().refine((value) => value === "" || MONEY_REGEX.test(value), MONEY_MESSAGE),
    ),
  })
  .superRefine((line, ctx) => {
    const recibida = qtyToUnits(line.cantidad_recibida) ?? 0;
    const previa = qtyToUnits(line.cantidad_facturada_previa) ?? 0;
    const disponible = Math.max(0, recibida - previa);

    // ── Cantidad ────────────────────────────────────────────────────────────
    const cantidad = qtyToUnits(line.cantidad);
    if (cantidad === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cantidad inválida",
        path: ["cantidad"],
      });
    } else if (tieneMasDeDosDecimales(cantidad)) {
      // BLOQUEO, no redondeo. El renglón de factura es Decimal(18,2) y la
      // recepción registra hasta 4 decimales: mandar "10.1250" es un 400, y
      // redondear en silencio cambiaría la cantidad facturada respecto de lo
      // recibido sin que nadie lo decida. El usuario debe capturar a propósito
      // una cantidad de 2 decimales (o corregir la recepción).
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `La cantidad ${unitsToQty(cantidad)} tiene más de 2 decimales y la factura solo admite 2. Captura una cantidad con 2 decimales como máximo; no se redondea automáticamente.`,
        path: ["cantidad"],
      });
    } else if (cantidad <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La cantidad debe ser mayor a 0",
        path: ["cantidad"],
      });
    } else if (cantidad > disponible) {
      // Facturación parcial permitida; por encima de lo disponible, no. El tope
      // descuenta lo ya facturado en otras facturas no canceladas (ver
      // `useSupplierInvoicesByRecepcion`) — es un bloqueo SUAVE: el backend no
      // lo impone.
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          previa > 0
            ? `Solo quedan ${unitsToQty(disponible)} por facturar (recibido ${unitsToQty(recibida)}, ya facturado ${unitsToQty(previa)})`
            : `No puede exceder lo recibido (${unitsToQty(recibida)})`,
        path: ["cantidad"],
      });
    }

    // ── Importes ────────────────────────────────────────────────────────────
    const precio = importeACentavos(line.precio_unitario);
    if (precio !== null && precio <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: line.precio_oc_oculto
          ? "Captura el precio unitario (la orden de compra no muestra precios para tu rol)"
          : "El precio unitario debe ser mayor a 0",
        path: ["precio_unitario"],
      });
    }

    // Descuento que no se pudo aplicar automáticamente: se exige capturarlo, aunque
    // sea un 0 explícito. Sin esto el aviso sería ignorable y el renglón viajaría
    // con descuento 0 sin que nadie lo hubiera decidido.
    if (line.descuento_manual_requerido && line.descuento === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: DESCUENTO_MANUAL_MESSAGE,
        path: ["descuento"],
      });
    }

    // El bruto sale de `calcularImportesLinea`, la MISMA fórmula que usan el
    // payload y los totales en vivo, para que la validación no pueda discrepar de
    // lo que se envía. La tasa de IVA es de cabecera y no llega al renglón, pero
    // el bruto no depende de ella: `"0"` es solo una tasa válida para que la
    // función calcule. Devuelve `null` con cantidad, precio o descuento inválidos
    // (o con más de 2 decimales), y entonces su propio campo ya avisa.
    const importes = calcularImportesLinea(line, "0");
    if (importes && importes.descuentoCents > importes.brutoCents) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El descuento no puede exceder el importe del renglón",
        path: ["descuento"],
      });
    }
  });

export const SupplierInvoiceFormSchema = z
  .object({
    /** FK a la OC. `0` = ninguna elegida. */
    oc: z.number().int().positive("Selecciona la orden de compra"),
    oc_folio: z.string(),
    /** FK a la recepción. `0` = ninguna elegida. */
    recepcion: z.number().int().positive("Selecciona la recepción a facturar"),
    recepcion_folio: z.string(),
    /** Derivado de la OC. `0` = la OC no tiene proveedor. */
    proveedor: z
      .number()
      .int()
      .positive("La orden de compra elegida no tiene proveedor asignado"),
    proveedor_nombre: z.string(),
    /** Derivado de la OC. */
    moneda: z.number().int().positive("La orden de compra elegida no tiene moneda"),
    moneda_codigo: z.string(),
    /** Derivado de la OC: la factura se registra en la sucursal de su orden. */
    sucursal: z.number().int().positive("La orden de compra elegida no tiene sucursal"),
    folio: z.string().max(30, "El folio no puede exceder 30 caracteres"),
    /** `""` o "YYYY-MM-DD" (input date). Requerida solo al registrar. */
    fecha_vencimiento: z.string(),
    /**
     * Tasa de IVA en porcentaje, de CABECERA. No viaja al API: sirve para
     * derivar el `impuesto` de cada renglón. Se siembra con el `porcentaje_iva`
     * de la OC cuando el rol del usuario lo deja ver.
     */
    tasa_iva: z.string().refine(
      (value) => tasaACentesimas(value) !== null,
      "Captura la tasa de IVA (porcentaje de 0 a 100, hasta 2 decimales)",
    ),
    observaciones: z.string(),
    /** Intención del botón pulsado. NO es un campo del formulario en pantalla. */
    estatus_objetivo: z.enum(["Borrador", "Registrada"]),
    /**
     * Al menos un renglón SIEMPRE, también en borrador: los renglones no se
     * pueden agregar después (escritura solo en el alta), así que un borrador
     * vacío sería una factura de total cero para siempre.
     */
    factura_proveedor_detalles: z
      .array(SupplierInvoiceLineFormSchema)
      .min(1, "Agrega al menos una partida de la recepción"),
  })
  .superRefine((data, ctx) => {
    // Una misma partida de la recepción no puede facturarse dos veces en la
    // misma factura. El selector ya las excluye; esto cubre cualquier otra vía.
    const vistas = new Set<number>();
    for (const line of data.factura_proveedor_detalles) {
      if (vistas.has(line.recepcion_detalle)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Hay partidas de la recepción repetidas en la factura",
          path: ["factura_proveedor_detalles"],
        });
        break;
      }
      vistas.add(line.recepcion_detalle);
    }

    if (data.estatus_objetivo !== "Registrada") return;

    // ── Reglas SOLO al registrar ─────────────────────────────────────────────
    // El bloqueo por total ≤ 0 NO vive aquí: lo aplica `useSupplierInvoiceForm`
    // con `motivoBloqueoRegistro`, la definición que comparten las tres entradas
    // de registro, y solo cuando el formulario ya es válido.
    registrarRefine(data.fecha_vencimiento, ctx);
  });

/**
 * Edición de CABECERA de un borrador ya guardado. Solo los campos que un PATCH
 * puede cambiar con sentido: los renglones son inmutables, y con ellos los
 * importes, la OC, la recepción, el proveedor y la moneda.
 */
export const SupplierInvoiceEditFormSchema = z
  .object({
    folio: z.string().max(30, "El folio no puede exceder 30 caracteres"),
    fecha_vencimiento: z.string(),
    observaciones: z.string(),
    estatus_objetivo: z.enum(["Borrador", "Registrada"]),
  })
  .superRefine((data, ctx) => {
    if (data.estatus_objetivo !== "Registrada") return;
    registrarRefine(data.fecha_vencimiento, ctx);
  });

/** Por qué no se puede registrar una factura ya guardada. */
export interface BloqueoRegistro {
  tipo: "sin_partidas" | "total_no_positivo" | "sin_vencimiento" | "cabecera_invalida";
  /** Sufijo corto para la opción del menú: "Registrar (…)". */
  etiqueta: string;
  /**
   * Solo la causa, sin ningún remedio. Lo usa el ALTA, donde las partidas todavía
   * se pueden corregir y el "cancela este borrador" de `motivo` sería falso.
   */
  causa: string;
  /**
   * El motivo en sí, sin instrucciones que dependan de desde dónde se intentó
   * registrar. Lo usa el formulario de edición.
   */
  motivo: string;
  /**
   * Motivo + qué hacer desde el LISTADO (la acción de fila). Solo difiere de
   * `motivo` en "sin vencimiento", donde la fila tiene que mandar al usuario a
   * "Editar"; dentro del formulario esa instrucción sería falsa, porque la fecha se
   * captura ahí mismo.
   */
  mensaje: string;
}

/**
 * Id del toast de "no se puede registrar", fijo POR FACTURA y compartido por las
 * dos entradas (acción de fila y formulario de edición): clics repetidos, o un
 * intento desde cada lado, reemplazan el aviso en vez de apilarlo.
 */
export const toastIdBloqueoRegistro = (facturaId: number): string =>
  `registrar-bloqueado-${facturaId}`;

/** Id del mismo aviso en el ALTA, donde todavía no hay factura (ni id). */
export const TOAST_ID_BLOQUEO_REGISTRO_ALTA = "registrar-bloqueado-alta";

/**
 * ¿Por qué NO se puede registrar esta factura? `null` si nada lo impide.
 *
 * Definición ÚNICA para las TRES entradas que registran: la acción de fila
 * "Registrar" (factura guardada), el botón "Registrar" de la edición (partidas y
 * total guardados + cabecera en pantalla) y el del alta (total derivado de las
 * partidas en pantalla). Registrar genera la cuenta por pagar con el `total` de
 * la factura y congela los importes, así que antes de hacerlo la factura tiene
 * que llevar lo mínimo para que esa CxP tenga sentido.
 *
 * Devuelve UN solo motivo aunque se cumplan varios, en orden de gravedad, para que
 * el usuario lea un mensaje coherente y no una pila de avisos contradictorios:
 *
 *  1. SIN PARTIDAS. Es el único caso irrecuperable: `factura_proveedor_detalles`
 *     es de escritura solo en el alta, así que un borrador sin partidas nunca
 *     podrá tenerlas. Pedirle además la fecha de vencimiento sería mandar al
 *     usuario a completar un documento que igual no podrá registrar.
 *  2. TOTAL CERO O NEGATIVO. Generaría una CxP sin nada que pagar (o con saldo
 *     negativo). Hay datos reales de este tipo: facturas con `total` distinto de
 *     cero, `subtotal` 0.00 y sin partidas — esas caen en el caso 1.
 *  3. SIN VENCIMIENTO. Se evalúa con el MISMO `SupplierInvoiceEditFormSchema` que
 *     usa la edición de cabecera con la intención `"Registrada"`, de modo que la
 *     acción de fila y el formulario leen una sola definición de esa regla.
 *  4. CABECERA INVÁLIDA. Cualquier otro fallo de ese esquema (p. ej. un folio de
 *     más de 30 caracteres capturado en la edición), con su propio mensaje.
 *
 * Los dos primeros NO se aplican al guardado de borradores: un borrador puede
 * guardarse incompleto; esto solo gatea el REGISTRO.
 */
export const motivoBloqueoRegistro = (factura: {
  folio: string | null;
  fecha_vencimiento: string | null;
  observaciones: string | null;
  total: string;
  factura_proveedor_detalles: readonly unknown[];
}): BloqueoRegistro | null => {
  if (factura.factura_proveedor_detalles.length === 0) {
    const motivo =
      "No se puede registrar: el borrador no tiene partidas. Además no es recuperable: las partidas solo se capturan al crear la factura, así que no podrán agregarse después. Cancela este borrador y crea una factura nueva con sus partidas.";
    return {
      tipo: "sin_partidas",
      etiqueta: "sin partidas",
      causa: "No se puede registrar: la factura no tiene partidas.",
      motivo,
      mensaje: motivo,
    };
  }

  // `Number` y no `toCents`/`MONEY_REGEX`: el total llega del backend y puede ser
  // negativo, que la regex de captura no acepta. Un valor no numérico también
  // bloquea: ante un dato corrupto, no se registra.
  const total = Number(factura.total);
  if (!Number.isFinite(total) || total <= 0) {
    const motivo =
      "No se puede registrar: el total del borrador es cero o menor, y generaría una cuenta por pagar sin nada que pagar. Las partidas y los importes no se pueden modificar desde aquí: cancela este borrador y crea una factura nueva con los importes correctos.";
    return {
      tipo: "total_no_positivo",
      etiqueta: "total en cero o negativo",
      causa:
        "No se puede registrar: el total es cero o menor, y generaría una cuenta por pagar sin nada que pagar.",
      motivo,
      mensaje: motivo,
    };
  }

  const result = SupplierInvoiceEditFormSchema.safeParse({
    folio: factura.folio ?? "",
    fecha_vencimiento: factura.fecha_vencimiento ?? "",
    observaciones: factura.observaciones ?? "",
    estatus_objetivo: "Registrada",
  });
  if (!result.success) {
    // La causa se decide por la RUTA del issue, no por el primero que llegue: con
    // un folio largo y sin fecha, el esquema reporta los dos (el refine de la
    // fecha corre igual) y el del folio va primero. La fecha tiene prioridad;
    // cualquier otro fallo de cabecera se reporta con SU mensaje, nunca como
    // "falta vencimiento".
    const issueFecha = result.error.issues.find((issue) => issue.path[0] === "fecha_vencimiento");
    if (issueFecha) {
      const motivo = issueFecha.message;
      return {
        tipo: "sin_vencimiento",
        etiqueta: "falta vencimiento",
        causa: motivo,
        motivo,
        mensaje: `${motivo}\nAbre la factura con "Editar", captura la fecha de vencimiento y regístrala desde ahí.`,
      };
    }
    const motivo = result.error.issues[0].message;
    return {
      tipo: "cabecera_invalida",
      etiqueta: "cabecera inválida",
      causa: motivo,
      motivo,
      mensaje: `${motivo}\nAbre la factura con "Editar", corrige la cabecera y regístrala desde ahí.`,
    };
  }

  return null;
};

export type SupplierInvoiceLineFormValues = z.infer<typeof SupplierInvoiceLineFormSchema>;
export type SupplierInvoiceFormValues = z.infer<typeof SupplierInvoiceFormSchema>;
export type SupplierInvoiceEditFormValues = z.infer<typeof SupplierInvoiceEditFormSchema>;

/**
 * Valores iniciales del alta. OC, recepción y renglones los siembran los
 * selectores; `tasa_iva` arranca VACÍA a propósito (no "16"): si la OC no deja
 * ver su tasa, el usuario la captura explícitamente en vez de heredar un
 * impuesto que nadie decidió.
 */
export const createEmptySupplierInvoiceForm = (): SupplierInvoiceFormValues => ({
  oc: 0,
  oc_folio: "",
  recepcion: 0,
  recepcion_folio: "",
  proveedor: 0,
  proveedor_nombre: "",
  moneda: 0,
  moneda_codigo: "",
  sucursal: 0,
  folio: "",
  fecha_vencimiento: "",
  tasa_iva: "",
  observaciones: "",
  estatus_objetivo: "Borrador",
  factura_proveedor_detalles: [],
});
