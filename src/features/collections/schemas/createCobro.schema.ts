import { z } from "zod";
import { MONEY_REGEX, toCents } from "@/src/features/accounts-receivable/schemas/register-pending-invoice.schema";
import { normalizeCapturedDecimal } from "@/src/utils/decimal";
import type { CobroMetodoPago, CobroReferencia } from "../interfaces/collection.interface";

/**
 * Esquemas del formulario de cobros (alta y edición de borradores).
 *
 * Validan los VALORES DEL FORMULARIO, no el payload: cada línea arrastra datos de
 * la CxC elegida (`saldo`, `moneda_codigo`, el folio) que no viajan al API pero
 * que la vista pinta y que los refines necesitan. El mapeo al cuerpo del API es
 * `buildCobroPayload` (`services/actions.ts`).
 *
 * Hay dos niveles, como en el backend:
 *
 * - `CobroDraftFormSchema` ("Guardar borrador"): un borrador no mueve saldos y
 *   el backend no revisa sus líneas al guardarlo. Pide la cabecera que el modelo
 *   exige (cliente y cuenta bancaria) y el tipo de cambio fuera de MXN; las
 *   líneas son opcionales, pero cada una debe estar bien formada (importe > 0 con
 *   hasta 2 decimales).
 * - `CobroFormSchema` ("Registrar" / "Aplicar"): lo anterior más las reglas que
 *   el backend aplica en `aplicar_cobro` —al menos una línea, cada importe <= el
 *   saldo de su CxC, sin CxC repetidas y toda CxC en la moneda de la cuenta
 *   bancaria—, para ahorrar el 400 de ida y vuelta (el 400 sigue siendo la
 *   autoridad, p. ej. ante una factura cancelada mientras tanto).
 *
 * El cuadre `suma == total_cobrado` no se valida: `total_cobrado` es DERIVADO de
 * las líneas (ver `sumImportesEnCentavos`), así que se cumple por
 * construcción.
 */

const MONEY_MESSAGE = "Importe inválido (usa hasta 2 decimales)";

/** Moneda en que el backend fija el tipo de cambio en 1 (y no lo pide). */
export const COBRO_MONEDA_LOCAL = "MXN";

/** `tipo_cambio` es `DecimalField(max_digits=18, decimal_places=6)`. */
const TIPO_CAMBIO_REGEX = /^\d{1,12}(\.\d{1,6})?$/;

/** ¿La moneda del cobro pide tipo de cambio? Solo una moneda conocida que no sea MXN. */
export const requiresTipoCambio = (moneda: string | null): boolean =>
  moneda !== null && moneda !== COBRO_MONEDA_LOCAL;

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

/** Línea del cobro bien formada: una CxC y el importe que se le aplica. */
const CobroLineBaseSchema = z.object({
  /** FK a la CuentaPorCobrar. Lo fija el selector, nunca el usuario. */
  cxc: z.number().int().positive(),
  /** Saldo vigente de la CxC: el TECHO del importe al aplicar. */
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
});

/** Línea lista para aplicarse: además, el importe no excede el saldo de su CxC. */
export const CobroLineFormSchema = CobroLineBaseSchema.superRefine((line, ctx) => {
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

const cobroHeaderShape = {
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
  /**
   * MXN por unidad de la moneda de la cuenta. Solo se valida y viaja fuera de
   * MXN (ver `requiresTipoCambio`), donde el backend lo exige aun en borrador.
   */
  tipo_cambio: z.string(),
  metodo_pago: z.enum(COBRO_METODOS_PAGO),
  referencia: z.enum(COBRO_REFERENCIAS),
  referencia_operacion: z
    .string()
    .max(100, "La referencia de operación no puede exceder 100 caracteres"),
  observaciones: z.string(),
};

type CobroHeaderValues = z.infer<z.ZodObject<typeof cobroHeaderShape>>;

/** Reglas de cabecera comunes a guardar borrador y a aplicar. */
const refineCobroHeader = (data: CobroHeaderValues, ctx: z.RefinementCtx) => {
  if (data.cuenta_bancaria > 0 && !data.moneda) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La cuenta bancaria no tiene moneda: elige otra",
      path: ["cuenta_bancaria"],
    });
  }

  if (requiresTipoCambio(data.moneda)) {
    const tipoCambio = normalizeCapturedDecimal(data.tipo_cambio);
    if (!tipoCambio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Indica el tipo de cambio (MXN por ${data.moneda})`,
        path: ["tipo_cambio"],
      });
    } else if (!TIPO_CAMBIO_REGEX.test(tipoCambio) || Number(tipoCambio) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tipo de cambio inválido: debe ser mayor a 0, con hasta 6 decimales",
        path: ["tipo_cambio"],
      });
    }
  }
};

/** "Registrar cobro" / "Aplicar": el cobro completo, tal como lo aplicará el backend. */
export const CobroFormSchema = z
  .object({
    ...cobroHeaderShape,
    cobro_detalles: z.array(CobroLineFormSchema).min(1, "Agrega al menos una cuenta por cobrar"),
  })
  .superRefine((data, ctx) => {
    refineCobroHeader(data, ctx);

    // El selector ya excluye las CxC elegidas; aquí se afirma igual, porque el
    // backend rechaza la CxC repetida hasta aplicar.
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

/**
 * "Guardar borrador": solo la cabecera que el backend exige y líneas bien
 * formadas, sin mínimo. Saldo, moneda y repetidas se revisan al aplicar.
 */
export const CobroDraftFormSchema = z
  .object({
    ...cobroHeaderShape,
    cobro_detalles: z.array(CobroLineBaseSchema),
  })
  .superRefine(refineCobroHeader);

export type CobroLineFormValues = z.infer<typeof CobroLineFormSchema>;
export type CobroFormValues = z.infer<typeof CobroFormSchema>;

/** Valores iniciales: sin líneas (las siembra el selector de CxC). */
export const createEmptyCobroForm = (): CobroFormValues => ({
  cliente: 0,
  cuenta_bancaria: 0,
  moneda: null,
  fecha_cobro: "",
  tipo_cambio: "",
  metodo_pago: "Transferencia",
  referencia: "SPEI",
  referencia_operacion: "",
  observaciones: "",
  cobro_detalles: [],
});
