import { z } from "zod";
import { MONEY_REGEX, toCents } from "@/src/features/accounts-receivable/schemas/register-pending-invoice.schema";
import { normalizeCapturedDecimal } from "@/src/utils/decimal";
import type { CobroMetodoPago, CobroReferencia } from "../interfaces/collection.interface";

/**
 * Esquema del formulario de alta de cobros.
 *
 * Valida los VALORES DEL FORMULARIO, no el payload: cada línea arrastra datos de
 * la CxC elegida (`saldo`, `moneda_codigo`, el folio) que no viajan al API pero
 * que la vista pinta y que los refines necesitan. El mapeo al cuerpo del API es
 * `buildCobroPayload` (`services/actions.ts`).
 *
 * Reglas espejo de las que aplica el backend, para ahorrar el 400 de ida y
 * vuelta (el 400 sigue siendo la autoridad): al menos una línea; cada importe
 * > 0 y <= el saldo de su CxC.
 *
 * Reglas que el backend NO impone y por eso se afirman aquí:
 *  - sin CxC repetidas: el backend valida cada línea contra el saldo ORIGINAL,
 *    así que dos líneas sobre la misma CxC pasan y el cobro se sobre-aplica;
 *  - toda CxC en la moneda de la cuenta bancaria: el backend no compara monedas
 *    y aplicaría un importe USD 1:1 sobre una cuenta MXN.
 *
 * El cuadre `suma == total_cobrado` no se valida: `total_cobrado` es DERIVADO de
 * las líneas (ver `sumImportesEnCentavos`), así que se cumple por
 * construcción.
 */

const MONEY_MESSAGE = "Importe inválido (usa hasta 2 decimales)";

export const COBRO_METODOS_PAGO = [
  "Transferencia",
  "Efectivo",
  "Cheque",
  "Tarjeta",
] as const satisfies readonly CobroMetodoPago[];

export const COBRO_REFERENCIAS = [
  "SPEI",
  "Cheque",
  "Autorizacion TPV",
] as const satisfies readonly CobroReferencia[];

/** Línea del cobro: una CxC y el importe que se le aplica. */
export const CobroLineFormSchema = z
  .object({
    /** FK a la CuentaPorCobrar. Lo fija el selector, nunca el usuario. */
    cxc: z.number().int().positive(),
    /** Saldo de la CxC al elegirla: el TECHO del importe. */
    saldo: z.string(),
    /** Moneda de la factura de la CxC, para el candado contra la cuenta. */
    moneda_codigo: z.string(),
    /** Folio de la factura (o `CxC #id` de respaldo), solo para mostrar. */
    factura_folio: z.string(),
    importe_aplicado: z
      .string()
      .min(1, "El importe es requerido")
      .refine((v) => MONEY_REGEX.test(normalizeCapturedDecimal(v)), MONEY_MESSAGE)
      .refine((v) => Number(normalizeCapturedDecimal(v)) > 0, "El importe debe ser mayor a 0"),
    observaciones: z.string(),
  })
  .superRefine((line, ctx) => {
    // Con un importe malformado su propio campo ya reporta el error: comparar
    // contra el saldo daría un segundo mensaje confuso.
    const importe = normalizeCapturedDecimal(line.importe_aplicado);
    if (!MONEY_REGEX.test(importe) || !MONEY_REGEX.test(line.saldo)) return;
    if (toCents(importe) > toCents(line.saldo)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El importe no puede exceder el saldo de la cuenta por cobrar",
        path: ["importe_aplicado"],
      });
    }
  });

export const CobroFormSchema = z
  .object({
    cliente: z.number().int().positive("El cliente es requerido"),
    cuenta_bancaria: z.number().int().positive("La cuenta bancaria es requerida"),
    /**
     * Moneda de la cuenta bancaria elegida (su `moneda_codigo`): la moneda del
     * cobro. No viaja al API; la fija el formulario al elegir la cuenta.
     */
    moneda: z.string().nullable(),
    // `<input type="date">` entrega "" o "YYYY-MM-DD". Vacío es válido: el backend
    // aplica su default (hoy) cuando la llave se OMITE (ver `buildCobroPayload`).
    fecha_cobro: z.string(),
    metodo_pago: z.enum(COBRO_METODOS_PAGO),
    referencia: z.enum(COBRO_REFERENCIAS),
    referencia_operacion: z
      .string()
      .max(100, "La referencia de operación no puede exceder 100 caracteres"),
    observaciones: z.string(),
    cobro_detalles: z.array(CobroLineFormSchema).min(1, "Agrega al menos una cuenta por cobrar"),
  })
  .superRefine((data, ctx) => {
    // El filtrado del selector es una comodidad; las líneas se afirman aquí.
    if (data.cuenta_bancaria > 0 && !data.moneda) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La cuenta bancaria no tiene moneda: elige otra",
        path: ["cuenta_bancaria"],
      });
    }

    const vistos = new Set<number>();
    for (const line of data.cobro_detalles) {
      if (vistos.has(line.cxc)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Hay cuentas por cobrar repetidas en el cobro",
          path: ["cobro_detalles"],
        });
        break;
      }
      vistos.add(line.cxc);
    }

    if (data.moneda) {
      data.cobro_detalles.forEach((line, index) => {
        if (line.moneda_codigo !== data.moneda) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `La factura está en ${line.moneda_codigo}; la cuenta bancaria, en ${data.moneda}`,
            path: ["cobro_detalles", index, "_form"],
          });
        }
      });
    }
  });

export type CobroLineFormValues = z.infer<typeof CobroLineFormSchema>;
export type CobroFormValues = z.infer<typeof CobroFormSchema>;

/** Valores iniciales: sin líneas (las siembra el selector de CxC). */
export const createEmptyCobroForm = (): CobroFormValues => ({
  cliente: 0,
  cuenta_bancaria: 0,
  moneda: null,
  fecha_cobro: "",
  metodo_pago: "Transferencia",
  referencia: "SPEI",
  referencia_operacion: "",
  observaciones: "",
  cobro_detalles: [],
});
