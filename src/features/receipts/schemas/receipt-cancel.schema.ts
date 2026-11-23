import { z } from "zod";
import { countCodePoints } from "@/src/features/orders/schemas/pedido-programacion.schema";

/** `MOTIVO_CANCELACION_MAX` de nucleo-erp (compras/services/cancelacion_recepcion.py). */
export const RECEIPT_CANCEL_MOTIVO_MAX = 500;

/**
 * Formulario de "Cancelar recepción" (EC-925). El motivo es OBLIGATORIO y se
 * recorta antes de validar, como hace el backend (`motivo.strip()`), para que
 * uno de solo espacios no pase. El máximo se mide en code points, que es lo
 * que cuenta `len()` en Python: un emoji cuenta 1, no 2.
 */
export const CancelReceiptFormSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(1, "El motivo de cancelación es requerido.")
    .refine(
      (value) => countCodePoints(value) <= RECEIPT_CANCEL_MOTIVO_MAX,
      `El motivo de cancelación admite a lo más ${RECEIPT_CANCEL_MOTIVO_MAX} caracteres.`,
    ),
});

export type CancelReceiptFormValues = z.infer<typeof CancelReceiptFormSchema>;
