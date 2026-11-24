import { z } from "zod";
import { countCodePoints } from "@/src/features/orders/schemas/pedido-programacion.schema";
import { WMS_CANCEL_MOTIVO_MAX } from "../constants/wmsCancellation";

/**
 * Motivo de una cancelación de WMS o de la reversa de una TR (EC-945).
 * OBLIGATORIO y recortado antes de validar, como el backend
 * (`str(motivo).strip()`), para que uno de solo espacios no pase. El máximo se
 * mide en code points, lo que cuenta `len()` en Python.
 */
export const WmsCancelFormSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(1, "El motivo es requerido.")
    .refine(
      (value) => countCodePoints(value) <= WMS_CANCEL_MOTIVO_MAX,
      `El motivo admite a lo más ${WMS_CANCEL_MOTIVO_MAX} caracteres.`,
    ),
});

export type WmsCancelFormValues = z.infer<typeof WmsCancelFormSchema>;
