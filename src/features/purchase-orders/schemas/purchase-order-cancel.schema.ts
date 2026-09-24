import { z } from "zod";

/**
 * Formulario del diálogo de cancelación de una orden de compra. El motivo es
 * OBLIGATORIO (el backend responde 400 si llega en blanco): se recorta antes de
 * validar para que un motivo de solo espacios no pase como válido.
 */
export const CancelPurchaseOrderFormSchema = z.object({
  motivo_cancelacion: z
    .string()
    .trim()
    .min(1, "El motivo de cancelación es requerido."),
});

export type CancelPurchaseOrderFormValues = z.infer<typeof CancelPurchaseOrderFormSchema>;
