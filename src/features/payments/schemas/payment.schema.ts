import { z } from "zod";
import { MONEY_REGEX, toCents } from "@/src/features/accounts-receivable/schemas/register-pending-invoice.schema";

/**
 * Esquema del formulario de alta de pagos a proveedor.
 *
 * Valida los VALORES DEL FORMULARIO, no el payload: cada línea arrastra datos de
 * la CxP elegida (`saldo`, `moneda_codigo`, el folio) que NO viajan al API pero
 * que la vista necesita para pintar el renglón y que el `superRefine` necesita
 * para validar el techo. El mapeo al cuerpo del API vive en
 * `utils/buildPagoPayload.ts`.
 *
 * `MONEY_REGEX`/`toCents` se reutilizan de CxC en vez de reescribirse: son la
 * fuente de verdad del proyecto para dinero de 2 decimales y comparación en
 * centavos enteros.
 *
 * Reglas espejo de las que aplica el backend, para evitar el 400 de ida y vuelta
 * (el 400 sigue siendo la autoridad):
 *  - al menos una línea;
 *  - `importe_aplicado` > 0 y con formato de dinero;
 *  - `importe_aplicado` <= `saldo` de su CxP.
 *
 * NO se valida aquí el cuadre `sum(importe_aplicado) == total_pagado`: en esta
 * UI `total_pagado` es DERIVADO de las líneas (ver `buildPagoPayload`), así que
 * la igualdad se cumple por construcción y un refine sería tautológico. El
 * mensaje de cuadre del backend sí tiene dónde pintarse: llega en la llave
 * `total_pagado` y el formulario la trata como campo de cabecera.
 */

const MONEY_MESSAGE = "Importe inválido (usa hasta 2 decimales)";

/**
 * Línea del pago: una CxP y el importe que se le aplica.
 *
 * `cxp`, `saldo`, `moneda_codigo` y `factura_folio` los siembra el selector y no
 * se editan; viven en los valores del formulario solo para pintar el renglón y
 * validar el techo.
 */
export const PagoLineFormSchema = z
  .object({
    /** FK a la CuentaPorPagar. Lo fija el selector, nunca el usuario. */
    cxp: z.number().int().positive(),
    /** Saldo de la CxP al momento de elegirla — el TECHO del importe. */
    saldo: z.string(),
    /** Código ISO de la moneda de la factura, para formatear y para el candado. */
    moneda_codigo: z.string().nullable(),
    /** Folio de la factura (o `CxP #id` de respaldo), solo para mostrar. */
    factura_folio: z.string(),
    importe_aplicado: z
      .string()
      .min(1, "El importe es requerido")
      .regex(MONEY_REGEX, MONEY_MESSAGE)
      .refine((v) => Number(v) > 0, "El importe debe ser mayor a 0"),
    observaciones: z.string(),
  })
  .superRefine((line, ctx) => {
    // Techo por línea. Se omite si el importe no pasa el formato: en ese caso el
    // propio campo ya reporta su error y comparar contra el saldo produciría un
    // segundo mensaje confuso (mismo criterio que el cuadre de CxC).
    if (!MONEY_REGEX.test(line.importe_aplicado)) return;
    if (!MONEY_REGEX.test(line.saldo)) return;
    if (toCents(line.importe_aplicado) > toCents(line.saldo)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El importe no puede exceder el saldo de la cuenta",
        path: ["importe_aplicado"],
      });
    }
  });

/**
 * Moneda a la que quedó fijado el pago, derivada de sus líneas.
 *
 * Devuelve `undefined` cuando NO hay líneas (sin candado: se acepta cualquier
 * divisa) y `string | null` cuando ya hay al menos una (candado fijado). La
 * distinción importa: `moneda_codigo` es nullable —viene de
 * `factura_proveedor.moneda.codigo_iso`—, así que `null` es un valor de candado
 * legítimo ("solo CxP sin moneda resuelta"), NO la ausencia de candado. Antes
 * ambos casos colapsaban en `null` y una primera CxP sin moneda desactivaba el
 * candado por completo.
 *
 * Definición ÚNICA del candado: la usan el indicador de la vista, el filtro del
 * selector y el `superRefine` de abajo.
 */
export const monedaDelPago = (
  lines: PagoLineFormValues[],
): string | null | undefined => (lines.length === 0 ? undefined : lines[0].moneda_codigo);

export const PagoFormSchema = z
  .object({
    proveedor: z.number().int().positive("El proveedor es requerido"),
    cuenta_bancaria: z.number().int().positive("La cuenta bancaria es requerida"),
    // `<input type="date">` entrega "" o "YYYY-MM-DD". Vacío es válido: el backend
    // aplica su default `timezone.localdate` cuando la llave se OMITE (ver
    // `buildPagoPayload` — nunca se manda `null`, el campo no es nullable).
    fecha_pago: z.string(),
    metodo_pago: z.enum(["Efectivo", "Transferencia", "Tarjeta", "Cheque"]),
    referencia: z.string().max(100, "La referencia no puede exceder 100 caracteres"),
    referencia_operacion: z
      .string()
      .max(100, "La referencia de operación no puede exceder 100 caracteres"),
    observaciones: z.string(),
    pago_detalles: z
      .array(PagoLineFormSchema)
      .min(1, "Agrega al menos una cuenta por pagar"),
  })
  .superRefine((data, ctx) => {
    // Reglas que MIRAN EL ARREGLO COMPLETO. El filtrado del selector
    // (`alreadySelectedIds` / `monedaCodigo`) es una comodidad de la interfaz, no
    // una validación: `addLines` puede sembrar líneas sin pasar por él, así que
    // los dos invariantes se afirman aquí.

    // 1. Una CxP no puede aplicarse dos veces en el mismo pago: serían dos
    //    importes contra un mismo saldo, y el backend valida cada renglón por
    //    separado, así que podría aceptarlos.
    const vistos = new Set<number>();
    for (const line of data.pago_detalles) {
      if (vistos.has(line.cxp)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Hay cuentas por pagar repetidas en el pago",
          path: ["pago_detalles"],
        });
        break;
      }
      vistos.add(line.cxp);
    }

    // 2. Un pago sale de UNA cuenta bancaria, con una sola moneda, y aquí no se
    //    convierten divisas: mezclarlas haría de `total_pagado` una suma sin
    //    significado. `null` cuenta como su propio valor de moneda (ver
    //    `monedaDelPago`), no como comodín.
    const moneda = monedaDelPago(data.pago_detalles);
    if (
      moneda !== undefined &&
      data.pago_detalles.some((line) => line.moneda_codigo !== moneda)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Todas las cuentas por pagar deben ser de la misma moneda",
        path: ["pago_detalles"],
      });
    }
  });

export type PagoLineFormValues = z.infer<typeof PagoLineFormSchema>;
export type PagoFormValues = z.infer<typeof PagoFormSchema>;

/** Valores iniciales del formulario — sin líneas: las siembra el selector de CxP. */
export const createEmptyPagoForm = (): PagoFormValues => ({
  proveedor: 0,
  cuenta_bancaria: 0,
  fecha_pago: "",
  metodo_pago: "Transferencia",
  referencia: "",
  referencia_operacion: "",
  observaciones: "",
  pago_detalles: [],
});

/**
 * Suma de los importes capturados, en CENTAVOS enteros.
 *
 * Es la definición ÚNICA del total del pago: la usan por igual el indicador en
 * vivo de la vista y `buildPagoPayload` al armar `total_pagado`, de modo que lo
 * que el usuario ve y lo que viaja al API no puedan discrepar. Las líneas con
 * importe malformado se ignoran (su propio campo ya reporta el error).
 */
export const sumImportesEnCentavos = (lines: PagoLineFormValues[]): number =>
  lines.reduce(
    (total, line) =>
      MONEY_REGEX.test(line.importe_aplicado)
        ? total + toCents(line.importe_aplicado)
        : total,
    0,
  );

/**
 * Centavos enteros → string decimal de 2 posiciones ("116000" → "1160.00").
 *
 * Pareja de `sumImportesEnCentavos` y, como ella, definición ÚNICA: el total que
 * se pinta en el formulario y el `total_pagado` que viaja al API salen de esta
 * misma función, así que no pueden discrepar ni siquiera si algún día cambia el
 * redondeo o la precisión.
 */
export const centavosAMoneda = (cents: number): string => (cents / 100).toFixed(2);
