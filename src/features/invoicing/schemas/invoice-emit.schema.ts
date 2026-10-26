import { z } from "zod";
import { normalizeCapturedDecimal } from "@/src/utils/decimal";
import { requiresInvoiceTipoCambio } from "../utils/invoiceCurrency";

/**
 * `tipo_cambio` es `DecimalField(max_digits=18, decimal_places=6)`: hasta 12
 * enteros y 6 decimales. Misma regla que el tipo de cambio de los cobros
 * (`createCobro.schema.ts`).
 */
export const INVOICE_TIPO_CAMBIO_REGEX = /^\d{1,12}(\.\d{1,6})?$/;

/**
 * Formulario del diálogo "Emitir factura". `moneda` es el código ISO de la
 * factura (`moneda_nombre`): solo fuera de MXN se pide `tipo_cambio`, que debe
 * ser mayor a 0 (`min_value=0.000001` en el backend). La salida trae el tipo
 * de cambio ya normalizado para enviarse, o `null` en MXN, donde NO se manda.
 */
export const EmitInvoiceFormSchema = z
  .object({
    moneda: z.string(),
    tipo_cambio: z.string(),
  })
  .superRefine((data, ctx) => {
    if (!requiresInvoiceTipoCambio({ moneda_nombre: data.moneda })) return;
    const tipoCambio = normalizeCapturedDecimal(data.tipo_cambio);
    if (!tipoCambio) {
      ctx.addIssue({
        code: "custom",
        message: `Indica el tipo de cambio (MXN por ${data.moneda || "unidad"})`,
        path: ["tipo_cambio"],
      });
    } else if (!INVOICE_TIPO_CAMBIO_REGEX.test(tipoCambio) || Number(tipoCambio) <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "Tipo de cambio inválido: debe ser mayor a 0, con hasta 6 decimales",
        path: ["tipo_cambio"],
      });
    }
  })
  .transform((data) => ({
    tipo_cambio: requiresInvoiceTipoCambio({ moneda_nombre: data.moneda })
      ? normalizeCapturedDecimal(data.tipo_cambio)
      : null,
  }));

export type EmitInvoiceFormInput = z.input<typeof EmitInvoiceFormSchema>;
export type EmitInvoiceFormOutput = z.output<typeof EmitInvoiceFormSchema>;
