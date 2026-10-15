import { z } from "zod";

/** Largo con el que el backend recorta el motivo (`[:200]` en la acción `cancelar`). */
export const INVOICE_CANCEL_MOTIVO_MAX_LENGTH = 200;

/**
 * Formulario del diálogo de cancelación de una factura. El motivo es OPCIONAL
 * (el backend lo agrega a `observaciones` como "Cancelada: <motivo>"); se
 * recorta antes de validar y se limita a lo que el backend guarda, para no
 * mandar texto que se perdería en silencio.
 */
export const CancelInvoiceFormSchema = z.object({
  motivo: z
    .string()
    .trim()
    .max(
      INVOICE_CANCEL_MOTIVO_MAX_LENGTH,
      `El motivo admite como máximo ${INVOICE_CANCEL_MOTIVO_MAX_LENGTH} caracteres.`,
    ),
});

export type CancelInvoiceFormValues = z.infer<typeof CancelInvoiceFormSchema>;
