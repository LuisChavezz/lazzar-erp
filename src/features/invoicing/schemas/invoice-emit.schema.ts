import { z } from "zod";
import { normalizeCapturedDecimal } from "@/src/utils/decimal";
import { getTipoCambioError } from "@/src/utils/tipoCambio";
import { requiresInvoiceTipoCambio } from "../utils/invoiceCurrency";

/**
 * Formulario del diálogo "Emitir factura". `moneda` es el código ISO de la
 * factura (`moneda_nombre`): solo fuera de MXN se pide `tipo_cambio`, con la
 * misma regla que el de los cobros (`getTipoCambioError`). La salida trae el
 * tipo de cambio ya normalizado para enviarse, o `null` en MXN, donde NO se
 * manda.
 */
export const EmitInvoiceFormSchema = z
  .object({
    moneda: z.string(),
    tipo_cambio: z.string(),
  })
  .superRefine((data, ctx) => {
    if (!requiresInvoiceTipoCambio({ moneda_nombre: data.moneda })) return;
    const tipoCambioError = getTipoCambioError(data.tipo_cambio, data.moneda || "unidad");
    if (tipoCambioError) {
      ctx.addIssue({ code: "custom", message: tipoCambioError, path: ["tipo_cambio"] });
    }
  })
  .transform((data) => ({
    tipo_cambio: requiresInvoiceTipoCambio({ moneda_nombre: data.moneda })
      ? normalizeCapturedDecimal(data.tipo_cambio)
      : null,
  }));

export type EmitInvoiceFormInput = z.input<typeof EmitInvoiceFormSchema>;
export type EmitInvoiceFormOutput = z.output<typeof EmitInvoiceFormSchema>;
