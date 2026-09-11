import { z } from "zod";
import {
  MONEY_REGEX,
  toCents,
} from "@/src/features/accounts-receivable/schemas/register-pending-invoice.schema";
import { POLIZA_TIPOS, type Poliza } from "../interfaces/poliza.interface";

/**
 * Esquema del formulario de alta de pólizas contables.
 *
 * Valida los VALORES DEL FORMULARIO, no el payload: la cabecera arrastra un
 * `estatus_objetivo` que NUNCA viaja al API (ver abajo) y los ids de catálogo
 * usan `0` como centinela de "sin seleccionar", el mismo criterio del resto de
 * selectores del proyecto. El mapeo al cuerpo del API vive en
 * `utils/buildPolizaPayload.ts`.
 *
 * `MONEY_REGEX`/`toCents` se reutilizan de CxC en vez de reescribirse: son la
 * fuente de verdad del proyecto para dinero de 2 decimales y comparación en
 * centavos enteros.
 *
 * ─── EL CUADRE NO BLOQUEA EL BORRADOR ────────────────────────────────────────
 *
 * El backend deja crear una póliza DESCUADRADA: `perform_create` no llama a
 * `validar_suma_cero` — solo lo hace `PolizaService.contabilizar`. Guardar un
 * borrador descuadrado es por tanto un caso legítimo (una póliza a medio
 * capturar), y este esquema lo respeta: la regla de cuadre se aplica SOLO cuando
 * `estatus_objetivo` es `"Contabilizada"`. Es la misma forma que usa la nota de
 * crédito para sus reglas "solo al emitir".
 *
 * ─── `estatus_objetivo` NO ES EL `estatus` DEL API ───────────────────────────
 *
 * Se llama distinto a propósito. Es la INTENCIÓN del botón que se pulsó, y
 * decide dos cosas: qué reglas aplica el `superRefine` de abajo y si, después de
 * crear, el formulario encadena la acción `contabilizar`. El `estatus` que viaja
 * en el POST es SIEMPRE el literal `"Borrador"` (ver `CreatePolizaPayload`):
 * mandar `"Contabilizada"` la dejaría contabilizada SIN pasar por la validación
 * de cuadre, porque `perform_create` guarda el valor tal cual.
 */

const MONEY_MESSAGE = "Importe inválido (usa hasta 2 decimales)";

/**
 * Tolerancia del cuadre, en CENTAVOS enteros.
 *
 * Es la del backend, no una elección de esta capa: tanto
 * `PolizaService.validar_suma_cero` (`abs(cargos − abonos) > Decimal("0.01")` →
 * 400) como el campo calculado `cuadre_correcto`
 * (`abs(c − a) <= Decimal("0.01")`) usan un centavo. Exigir aquí una igualdad
 * EXACTA sería ser más estricto que la autoridad: bloquearía en la interfaz una
 * póliza con un centavo de diferencia que el backend contabilizaría sin
 * problema, y el usuario no tendría forma de saber por qué.
 */
export const CUADRE_TOLERANCIA_CENTAVOS = 1;

/** Centavos enteros → string decimal de 2 posiciones ("116000" → "1160.00"). */
export const centavosAMoneda = (cents: number): string => (cents / 100).toFixed(2);

/**
 * ¿Cuadra la póliza? Espejo EXACTO de `PolizaService.validar_suma_cero` y del
 * campo calculado `cuadre_correcto`, incluida su tolerancia de un centavo
 * (ver `CUADRE_TOLERANCIA_CENTAVOS`).
 */
export const estaCuadrada = (cargos: number, abonos: number): boolean =>
  Math.abs(cargos - abonos) <= CUADRE_TOLERANCIA_CENTAVOS;

/** Mensaje único de "la póliza no cuadra". Ver `POLIZA_DESCUADRADA_MESSAGE`. */
const descuadreMessage = (cargos: number, abonos: number): string =>
  `La póliza no cuadra: los cargos suman ${centavosAMoneda(cargos)} y los abonos ${centavosAMoneda(abonos)} (diferencia ${centavosAMoneda(Math.abs(cargos - abonos))}). Para contabilizar, ambos totales deben coincidir.`;

/**
 * Mensaje único de "no se puede contabilizar una póliza sin cuadrar", para el
 * camino en que la póliza YA está guardada (el listado) y no pasa por este
 * esquema. Mismo criterio que `TOTAL_CERO_MESSAGE` en notas de crédito: la
 * regla se aplica en dos caminos distintos y el usuario debe leer lo mismo.
 */
export const POLIZA_DESCUADRADA_MESSAGE =
  "La póliza no cuadra: la suma de cargos debe ser igual a la de abonos para contabilizarla.";

/**
 * ¿La póliza YA GUARDADA tiene algún importe real?
 *
 * Espejo, sobre los totales que calcula el servidor, del `hayImportes` que el
 * formulario deriva de sus líneas: sin él, una póliza SIN MOVIMIENTOS pasa por
 * cuadrada y se puede contabilizar. No es hipotético —
 * `PolizaSerializer` declara `poliza_detalles` con `required=False` y
 * `get_cuadre_correcto` hace `abs((Sum(cargo) or 0) - (Sum(abono) or 0)) <= 0.01`,
 * que da `true` con cero asientos—, y `PolizaService.validar_suma_cero` tampoco
 * lo atrapa (0 == 0), así que el documento quedaría cerrado como Contabilizada
 * sin contener un solo asiento y ya no se podría eliminar.
 *
 * Los totales llegan como decimales del backend. Un valor no numérico da `NaN`,
 * y `NaN > 0` es `false`: ante un dato corrupto la respuesta es "no hay
 * importes", que BLOQUEA la contabilización — el lado seguro.
 */
export const POLIZA_SIN_IMPORTES_MESSAGE =
  "La póliza no tiene movimientos con importe: no hay asiento que contabilizar.";

export const polizaTieneImportes = (
  totalCargos: string,
  totalAbonos: string,
): boolean => toCents(totalCargos) > 0 || toCents(totalAbonos) > 0;

/**
 * ¿Se puede ELIMINAR esta póliza desde la UI?
 *
 * Solo un `Borrador` CAPTURADO A MANO. El backend es más permisivo —acepta borrar
 * `Borrador` y `Cancelada`, y solo rechaza `Contabilizada`—, pero la UI se limita
 * a propósito por dos motivos:
 *
 * - `Cancelada` queda fuera: una póliza cancelada pudo haber estado contabilizada,
 *   y el diálogo de Cancelar promete que "se conserva en el listado". Mismo
 *   criterio que notas de crédito, que solo ofrece eliminar borradores.
 * - Las pólizas que GENERA el backend quedan fuera aunque nazcan en `Borrador`:
 *   el alta de una CxC pendiente crea su asiento automático con `factura` en los
 *   movimientos, y borrarlo destruiría el registro contable de esa factura. Se
 *   distinguen porque algún movimiento lleva un FK documental (`factura`,
 *   `factura_proveedor`, `pago`, `cobro` o `movimiento_bancario`); la captura
 *   manual nunca los envía (ver `CreatePolizaDetallePayload`).
 *
 * Se decide sobre `poliza_detalles`, que el listado ya trae anidado (list y
 * retrieve comparten `PolizaSerializer`). La comparación es contra `null`
 * estricto: si un FK llegara `undefined` —campo ausente en la respuesta— no se
 * puede afirmar que la póliza sea manual, y la respuesta es "no eliminable".
 */
export const polizaEsEliminable = (poliza: Poliza): boolean =>
  poliza.estatus === "Borrador" &&
  poliza.poliza_detalles.every(
    (detalle) =>
      detalle.factura === null &&
      detalle.factura_proveedor === null &&
      detalle.pago === null &&
      detalle.cobro === null &&
      detalle.movimiento_bancario === null,
  );

/**
 * Quita el punto de un importe A MEDIO TECLEAR ("12." → "12").
 *
 * `sanitizeDecimalInput` devuelve el punto colgante A PROPÓSITO mientras se
 * escribe: al teclear "12" y luego ".", el campo queda en `"12."` hasta que
 * llegue el primer decimal. `MONEY_REGEX` rechaza esa forma, así que sin esta
 * normalización el renglón caía fuera de las sumas y el panel de cuadre saltaba
 * a "Hay importes con formato inválido" en mitad de la captura — el mismo
 * síntoma que tenía el lado vacío.
 *
 * El patrón exige DÍGITOS antes del punto (`^\d+\.$`), así que solo cubre ese
 * estado de captura concreto y no relaja nada más: `"."` a secas, `"1.2.3"`,
 * `"abc"` y `"1.234"` no coinciden, se devuelven tal cual y `MONEY_REGEX` los
 * sigue rechazando.
 */
const sinPuntoFinal = (value: string): string =>
  /^\d+\.$/.test(value) ? value.slice(0, -1) : value;

/**
 * Importe de captura → CENTAVOS ENTEROS, o `null` si el texto no es dinero.
 *
 * ─── UN LADO VACÍO VALE CERO ─────────────────────────────────────────────────
 *
 * En partida doble CADA movimiento deja uno de sus dos lados sin usar: es la
 * forma normal de un asiento, no un descuido. Tratar el campo vacío como
 * "formato inválido" obligaba a teclear un "0" en el lado no usado de cada
 * renglón para que la póliza cuadrara, y mientras tanto la línea entera quedaba
 * FUERA de las sumas (ver `sumarLineasEnCentavos`), así que una póliza
 * perfectamente cuadrada se leía como 0.00 / 0.00 y descuadrada.
 *
 * Solo el VACÍO se interpreta como cero. Un texto no vacío pero mal formado
 * ("abc", "1.234", "1.2.3") sigue siendo inválido y lo reporta el campo:
 * convertirlo en cero en silencio guardaría un importe que el usuario no
 * escribió.
 *
 * Es la definición ÚNICA: la usan el campo del esquema, la regla cargo/abono y
 * la suma en vivo, de modo que no puedan discrepar.
 */
export const importeACentavos = (raw: string): number | null => {
  const value = sinPuntoFinal(raw.trim());
  if (value === "") return 0;
  if (!MONEY_REGEX.test(value)) return null;
  return toCents(value);
};

/**
 * Campo de dinero de captura.
 *
 * El vacío se normaliza a `"0.00"` ANTES de validar el formato (mismo recurso
 * que `optionalMoney` en el esquema de CxC), por el motivo de arriba, y el punto
 * colgante se recorta con el mismo criterio que `importeACentavos` — si no, un
 * envío con `"12."` en un campo pasaría el cuadre en vivo pero moriría en la
 * validación con "Importe inválido" sobre un valor sin decimales.
 */
const money = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = sinPuntoFinal(value.trim());
  return normalized === "" ? "0.00" : normalized;
}, z.string().regex(MONEY_REGEX, MONEY_MESSAGE));

/**
 * Movimiento (asiento) de la póliza.
 *
 * `cuenta_contable` es REQUERIDO aquí aunque el API lo declare nullable
 * (`on_delete=SET_NULL` obliga a `null=True` en el modelo, pero eso describe qué
 * pasa si se borra el catálogo, no qué es un asiento válido). Un movimiento sin
 * cuenta contable no dice contra qué se carga o abona: es un renglón sin
 * significado que el backend aceptaría en silencio. Es la misma clase de
 * "frontend más estricto que el backend" que el `folio` de la cabecera.
 *
 * `centro_costo` sí es opcional: el modelo lo permite nulo en la línea y la
 * cabecera ya lleva el suyo.
 */
export const PolizaLineFormSchema = z
  .object({
    /** FK a `CuentaContable`. `0` = ninguna elegida. */
    cuenta_contable: z
      .number()
      .int()
      .positive("Selecciona la cuenta contable del movimiento"),
    /** FK a `CentroCosto` de la LÍNEA. `0` = sin centro de costo (opcional). */
    centro_costo: z.number().int().nonnegative(),
    cargo: money,
    abono: money,
    referencia: z.string().max(200, "La referencia no puede exceder 200 caracteres"),
    observaciones: z.string(),
  })
  .superRefine((line, ctx) => {
    // CARGO XOR ABONO. La partida doble asienta un movimiento de UN lado: un
    // renglón con ambos lados informados es en realidad dos asientos disfrazados
    // de uno (y su neto ya se refleja en los totales, así que el descuadre no lo
    // delataría), y uno con los dos en cero no aporta nada al asiento.
    //
    // El backend NO impone esta regla —`cargo` y `abono` son dos decimales
    // independientes con default 0—, así que es la interfaz la que evita el
    // documento sin sentido. Si algún importe está malformado se omite: su
    // propio campo ya reporta el error y comparar valores NaN produciría un
    // segundo mensaje confuso (mismo criterio que el techo de pagos).
    //
    // Un lado VACÍO cuenta como cero (ver `importeACentavos`), así que la regla
    // sí se evalúa en el caso normal de un asiento de un solo lado — antes ese
    // caso salía por el early return y el XOR no llegaba a comprobarse.
    const cargo = importeACentavos(line.cargo);
    const abono = importeACentavos(line.abono);
    if (cargo === null || abono === null) return;

    if (cargo > 0 && abono > 0) {
      // Se marca el ABONO —no el cargo— porque el cargo es el lado que se
      // captura primero: el error señala el campo que sobra, no el que se puso.
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Captura cargo o abono, no ambos",
        path: ["abono"],
      });
      return;
    }

    if (cargo === 0 && abono === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Captura un importe en cargo o en abono",
        path: ["cargo"],
      });
    }
  });

/**
 * Sumas de cargos y abonos de los movimientos, en CENTAVOS ENTEROS.
 *
 * Definición ÚNICA del cuadre: la usan por igual el indicador en vivo del
 * formulario, el gateo del botón "Contabilizar" y el `superRefine` de abajo, de
 * modo que lo que el usuario ve y lo que valida el envío no puedan discrepar.
 *
 * En centavos enteros y NO en flotantes: `0.1 + 0.2 !== 0.3` en binario, así que
 * una póliza perfectamente cuadrada podría dar una diferencia fantasma de
 * 5.5e-17 y bloquear la acción sin motivo visible.
 *
 * `completo` es `false` si alguna línea tiene un importe MALFORMADO: en ese caso
 * las sumas están incompletas y no se debe concluir nada del cuadre. Un lado
 * VACÍO no es malformado: vale cero y la línea sigue contando (ver
 * `importeACentavos`).
 *
 * `hayImportes` distingue "cuadra" de "todavía no hay nada que cuadrar": un
 * formulario recién abierto tiene todos los importes en cero, y `0 === 0` haría
 * pasar por cuadrada una póliza vacía. Quien decida mostrar el cuadre o habilitar
 * la contabilización debe exigir además este `true`.
 */
export const sumarLineasEnCentavos = (
  lines: PolizaLineFormValues[],
): { cargos: number; abonos: number; completo: boolean; hayImportes: boolean } => {
  let cargos = 0;
  let abonos = 0;
  let completo = true;

  for (const line of lines) {
    const cargo = importeACentavos(line.cargo);
    const abono = importeACentavos(line.abono);
    if (cargo === null || abono === null) {
      completo = false;
      continue;
    }
    cargos += cargo;
    abonos += abono;
  }

  return { cargos, abonos, completo, hayImportes: cargos > 0 || abonos > 0 };
};

export const PolizaFormSchema = z
  .object({
    /** FK a `nucleo.Sucursal`. `0` = ninguna elegida. Requerido (NOT NULL). */
    sucursal: z.number().int().positive("La sucursal es requerida"),
    /** FK a `CentroCosto` de la CABECERA. `0` = sin centro de costo (opcional). */
    centro_costo: z.number().int().nonnegative(),
    /**
     * REQUERIDO EN EL FORMULARIO aunque el backend lo acepte nulo.
     *
     * `Poliza.__str__` es `return self.folio`: con `folio = None` cualquier
     * lugar que convierta la póliza a texto —el admin de Django, un mensaje de
     * error, un log— revienta con `TypeError`. Guardar una póliza sin folio es
     * dejar una fila que rompe herramientas ajenas a esta pantalla, así que la
     * interfaz es deliberadamente más estricta que el API.
     *
     * Tampoco se autogenera: `PolizaViewSet.perform_create` no asigna folio (el
     * consecutivo `POL-000001` solo lo produce el alta de CxC pendiente, por
     * dentro), y no hay endpoint que exponga el siguiente disponible.
     */
    folio: z
      .string()
      .trim()
      .min(1, "El folio es requerido")
      .max(30, "El folio no puede exceder 30 caracteres"),
    tipo: z.enum(POLIZA_TIPOS),
    concepto: z.string().max(200, "El concepto no puede exceder 200 caracteres"),
    /**
     * Intención del botón pulsado. NO es el `estatus` del API — ver el
     * encabezado de este archivo.
     */
    estatus_objetivo: z.enum(["Borrador", "Contabilizada"]),
    poliza_detalles: z
      .array(PolizaLineFormSchema)
      .min(1, "Agrega al menos un movimiento a la póliza"),
  })
  .superRefine((data, ctx) => {
    // El cuadre SOLO se exige al contabilizar. Un borrador descuadrado es un
    // documento en preparación que el backend acepta sin objeción.
    if (data.estatus_objetivo !== "Contabilizada") return;

    // Con algún importe malformado la suma no significa nada; el campo culpable
    // ya tiene su propio error.
    const { cargos, abonos, completo } = sumarLineasEnCentavos(data.poliza_detalles);
    if (!completo) return;

    if (!estaCuadrada(cargos, abonos)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: descuadreMessage(cargos, abonos),
        path: ["poliza_detalles"],
      });
    }
  });

export type PolizaLineFormValues = z.infer<typeof PolizaLineFormSchema>;
export type PolizaFormValues = z.infer<typeof PolizaFormSchema>;

/** Movimiento vacío: sin cuenta elegida y con los dos lados en cero. */
export const createEmptyPolizaLine = (): PolizaLineFormValues => ({
  cuenta_contable: 0,
  centro_costo: 0,
  cargo: "0.00",
  abono: "0.00",
  referencia: "",
  observaciones: "",
});

/**
 * Valores iniciales del formulario. Arranca con DOS movimientos porque la
 * partida doble necesita al menos dos (un cargo y su abono): abrir con uno solo
 * obligaría siempre al mismo primer clic.
 *
 * `sucursal` la siembra el formulario con la del workspace activo (ver
 * `usePolizaForm`); aquí queda en `0` para que esta función no dependa de
 * ningún estado global.
 */
export const createEmptyPolizaForm = (): PolizaFormValues => ({
  sucursal: 0,
  centro_costo: 0,
  folio: "",
  tipo: "Diario",
  concepto: "",
  estatus_objetivo: "Borrador",
  poliza_detalles: [createEmptyPolizaLine(), createEmptyPolizaLine()],
});

