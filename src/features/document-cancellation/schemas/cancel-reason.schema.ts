import { z } from "zod";
import { countCodePoints } from "@/src/features/orders/schemas/pedido-programacion.schema";
import { CANCEL_REASON_MAX } from "../constants/documentCancellation";

/**
 * Motivo de una cancelación con motivo (WMS, EC-945; Producción, EC-948).
 * OBLIGATORIO y recortado antes de validar, como el backend
 * (`str(motivo).strip()`), para que uno de solo espacios no pase. El máximo se
 * mide en code points, lo que cuenta `len()` en Python.
 */
export const CancelReasonFormSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(1, "El motivo es requerido.")
    .refine(
      (value) => countCodePoints(value) <= CANCEL_REASON_MAX,
      `El motivo admite a lo más ${CANCEL_REASON_MAX} caracteres.`,
    ),
});

export type CancelReasonFormValues = z.infer<typeof CancelReasonFormSchema>;
