import { z } from "zod";
import {
  MONEY_REGEX,
  toCents,
} from "@/src/features/accounts-receivable/schemas/register-pending-invoice.schema";

/**
 * Esquema del formulario de alta de notas de crédito.
 *
 * Valida los VALORES DEL FORMULARIO, no el payload: la cabecera arrastra datos
 * de la cuenta por cobrar elegida (`factura_folio`, `moneda_codigo`,
 * `cxc_saldo`) y cada línea arrastra los del concepto de la factura
 * (`producto_nombre`) que NO viajan al API pero que la vista necesita para
 * pintar y que el `superRefine` necesita para validar el techo. El mapeo al
 * cuerpo del API vive en `utils/buildNotaCreditoPayload.ts`.
 *
 * `MONEY_REGEX`/`toCents` se reutilizan de CxC en vez de reescribirse: son la
 * fuente de verdad del proyecto para dinero de 2 decimales y comparación en
 * centavos enteros.
 *
 * ─── LO QUE ESTE ESQUEMA **NO** VALIDA, A PROPÓSITO ────────────────────────
 *
 * 1. **`total` NO se deriva de las líneas, y no se exige que las líneas sumen
 *    `total`.** Es la diferencia estructural con el pago, donde `total_pagado`
 *    era una suma y el cuadre se cumplía por construcción. Aquí el backend
 *    aplica `nota.total` a la cuenta por cobrar SIN mirar las líneas
 *    (`NotaCreditoService.aplicar_nota_credito` solo lee `nota.total`), así que
 *    las líneas son documentales: describen QUÉ se acredita, no CUÁNTO. Forzar
 *    la igualdad inventaría una regla que el documento no tiene e impediría el
 *    caso legítimo de acreditar un monto global sin desglosarlo concepto a
 *    concepto.
 *
 * 2. **No se exige al menos una línea.** Por lo mismo: una nota sin desglose es
 *    un documento válido para el backend y para la operación.
 *
 * 3. **No se valida `total == subtotal + impuestos`.** El backend no lo hace
 *    (los tres son `DecimalField(default=0)` independientes) y `subtotal`/
 *    `impuestos` no tienen ningún efecto contable. Son campos informativos del
 *    documento; atarlos entre sí sería otra regla inventada.
 *
 * ─── LO QUE SÍ VALIDA ─────────────────────────────────────────────────────
 *
 * Solo reglas que el backend también aplica (para ahorrar el 400 de ida y
 * vuelta; el 400 sigue siendo la autoridad) o que evitan un documento sin
 * sentido:
 *  - factura y cliente elegidos;
 *  - importes con formato de dinero;
 *  - AL EMITIR: `total > 0` y `total <= saldo` de la CxC;
 *  - una misma línea de factura no se acredita dos veces.
 */

const MONEY_MESSAGE = "Importe inválido (usa hasta 2 decimales)";

/**
 * Motivo único de la regla "una nota en cero no se emite".
 *
 * Vive aquí —y no en cada punto de emisión— porque la regla se aplica en DOS
 * caminos que llegan al mismo efecto: el alta con `estatus: "Emitida"` (que la
 * valida en el `superRefine` de abajo) y la emisión de un borrador ya guardado
 * desde el listado, que no pasa por este esquema. El mensaje que ve el usuario
 * debe ser el mismo en ambos.
 */
export const TOTAL_CERO_MESSAGE = "El total debe ser mayor a 0 para emitir la nota";

/**
 * `true` si `total` es un importe con formato válido y mayor a 0 — la condición
 * que debe cumplirse para que emitir la nota acredite algo de verdad.
 *
 * Emitir una nota en cero es un no-op silencioso: el backend marca el documento
 * `Emitida` pero `aplicar_nota_credito` retorna sin tocar la cuenta por cobrar
 * cuando `total <= 0`, y responde 200. Quedaría una nota "emitida" que no
 * acreditó nada — justo la clase de éxito engañoso que el propio backend acaba
 * de eliminar para el caso de la factura sin CxC.
 *
 * Un `total` mal formado devuelve `false` pero NO es asunto de esta regla: en el
 * formulario ya lo reporta el campo con `MONEY_MESSAGE`, y una nota ya guardada
 * siempre trae un decimal válido del backend.
 */
export const totalEsAcreditable = (total: string): boolean =>
  MONEY_REGEX.test(total) && toCents(total) > 0;

/** Campo de dinero de captura: string con formato válido. Puede ser "0.00". */
const money = z
  .string()
  .min(1, "El importe es requerido")
  .regex(MONEY_REGEX, MONEY_MESSAGE);

/**
 * Línea de la nota: un concepto de la factura y los importes que se le
 * acreditan.
 *
 * `factura_detalle` y `producto_nombre` los siembra el selector y no se editan;
 * `producto_nombre` vive en los valores del formulario solo para pintar el
 * renglón (el API no lo recibe ni lo devuelve en la línea de la nota, que solo
 * expone el id del `factura_detalle`).
 *
 * Los cuatro importes SÍ son editables: acreditar parcialmente un concepto es el
 * caso normal de una nota de crédito.
 */
export const NotaCreditoLineFormSchema = z.object({
  /** FK al `FacturaDetalle`. Lo fija el selector, nunca el usuario. */
  factura_detalle: z.number().int().positive("Selecciona un concepto de la factura"),
  /** Nombre del producto del concepto, solo para mostrar. */
  producto_nombre: z.string(),
  /** Cantidad e importe originales del concepto en la factura, solo para mostrar. */
  cantidad_facturada: z.string(),
  total_facturado: z.string(),
  cantidad: money,
  precio_unitario: money,
  impuesto: money,
  subtotal: money,
  total: money,
});

export const NotaCreditoFormSchema = z
  .object({
    /** FK a la factura. `0` = ninguna elegida. */
    factura: z.number().int().positive("Selecciona la factura a acreditar"),
    /**
     * FK al cliente. NO lo elige el usuario: se deriva de la factura elegida. El
     * backend valida que coincida con `factura.cliente`, así que derivarlo es la
     * única forma de que nunca discrepe.
     */
    cliente: z.number().int().positive("Selecciona la factura a acreditar"),
    /** Folio de la factura, solo para mostrar. */
    factura_folio: z.string(),
    /** Código ISO de la moneda de la factura, para formatear importes. */
    moneda_codigo: z.string().nullable(),
    /**
     * Saldo de la cuenta por cobrar de la factura al momento de elegirla — el
     * TECHO de `total` cuando la nota se emite.
     */
    cxc_saldo: z.string(),
    folio: z.string().max(30, "El folio no puede exceder 30 caracteres"),
    motivo: z.string().max(255, "El motivo no puede exceder 255 caracteres"),
    subtotal: money,
    impuestos: money,
    total: money,
    /**
     * Qué se va a hacer al enviar. `Borrador` guarda el documento sin tocar la
     * cuenta por cobrar; `Emitida` aplica el crédito en el mismo POST. Vive en
     * los valores del formulario (y no como un argumento del submit) porque el
     * `superRefine` de abajo aplica reglas DISTINTAS según cuál sea: a un
     * borrador no se le exige todavía cuadrar con el saldo.
     */
    estatus: z.enum(["Borrador", "Emitida"]),
    observaciones: z.string(),
    nota_credito_detalles: z.array(NotaCreditoLineFormSchema),
  })
  .superRefine((data, ctx) => {
    // 1. Un mismo concepto de la factura no puede acreditarse dos veces: serían
    //    dos importes contra el mismo renglón. El filtrado del selector
    //    (`alreadySelectedIds`) es una comodidad de la interfaz, no una
    //    validación —`addLines` puede sembrar líneas sin pasar por él—, así que
    //    el invariante se afirma aquí. El backend NO lo impide.
    const vistos = new Set<number>();
    for (const line of data.nota_credito_detalles) {
      if (vistos.has(line.factura_detalle)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Hay conceptos repetidos en la nota",
          path: ["nota_credito_detalles"],
        });
        break;
      }
      vistos.add(line.factura_detalle);
    }

    // 2. Reglas que SOLO aplican al EMITIR. Un borrador es un documento en
    //    preparación: bloquearlo por un techo que el backend tampoco revisa
    //    mientras esté en `Borrador` impediría guardar el trabajo a medias.
    if (data.estatus !== "Emitida") return;

    if (!MONEY_REGEX.test(data.total)) return;

    // 2a. Nada que acreditar (ver `totalEsAcreditable`). Misma condición y mismo
    //     mensaje que usa el listado al emitir un borrador ya guardado.
    if (!totalEsAcreditable(data.total)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: TOTAL_CERO_MESSAGE,
        path: ["total"],
      });
      return;
    }

    // 2b. Techo: el crédito no puede superar el saldo de la cuenta por cobrar.
    //     Es la misma regla que aplica el backend
    //     (`total_nc > saldo + 0.0001` → 400 en la llave `total`); aquí se
    //     adelanta para evitar el viaje. Si el saldo no tiene formato de dinero
    //     se omite la comparación en vez de inventar un techo.
    if (!MONEY_REGEX.test(data.cxc_saldo)) return;
    if (toCents(data.total) > toCents(data.cxc_saldo)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `El total no puede superar el saldo por cobrar de la factura (${data.cxc_saldo})`,
        path: ["total"],
      });
    }
  });

export type NotaCreditoLineFormValues = z.infer<typeof NotaCreditoLineFormSchema>;
export type NotaCreditoFormValues = z.infer<typeof NotaCreditoFormSchema>;

/**
 * Valores iniciales del formulario — sin factura y sin líneas: ambas las siembra
 * el selector correspondiente. `estatus` arranca en `Borrador`, el mismo default
 * del modelo, y los botones del pie lo fijan antes de enviar.
 */
export const createEmptyNotaCreditoForm = (): NotaCreditoFormValues => ({
  factura: 0,
  cliente: 0,
  factura_folio: "",
  moneda_codigo: null,
  cxc_saldo: "",
  folio: "",
  motivo: "",
  subtotal: "0.00",
  impuestos: "0.00",
  total: "0.00",
  estatus: "Borrador",
  observaciones: "",
  nota_credito_detalles: [],
});

/**
 * Suma de los `total` de las líneas, en CENTAVOS enteros.
 *
 * SOLO PARA MOSTRAR. A diferencia de `sumImportesEnCentavos` en pagos —que era
 * la definición única de `total_pagado`—, esta suma NO alimenta ningún campo del
 * payload: existe para que la vista pueda enseñar, junto al `total` capturado,
 * cuánto suman los conceptos desglosados y el usuario note por su cuenta si
 * quiso que coincidieran. Las líneas con importe malformado se ignoran (su
 * propio campo ya reporta el error).
 */
export const sumTotalesDeLineasEnCentavos = (
  lines: NotaCreditoLineFormValues[],
): number =>
  lines.reduce(
    (total, line) =>
      MONEY_REGEX.test(line.total) ? total + toCents(line.total) : total,
    0,
  );

/** Centavos enteros → string decimal de 2 posiciones ("116000" → "1160.00"). */
export const centavosAMoneda = (cents: number): string => (cents / 100).toFixed(2);
