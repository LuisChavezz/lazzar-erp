import { z } from "zod";
import { countCodePoints } from "./pedido-programacion.schema";

/**
 * Largo con el que el backend recorta el motivo (`[:500]` en la acción
 * `cancelar`), en code points como Python. El campo no deja pasar de aquí
 * para que nada se trunque en silencio.
 */
export const PEDIDO_CANCEL_MOTIVO_MAX = 500;

/**
 * Formulario del diálogo "Cancelar pedido". El motivo es OBLIGATORIO (el
 * backend responde 400 si llega en blanco): se recorta antes de validar para
 * que un motivo de solo espacios no pase como válido.
 */
export const PedidoCancelFormSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(1, "Indica el motivo de la cancelación.")
    .refine(
      (value) => countCodePoints(value) <= PEDIDO_CANCEL_MOTIVO_MAX,
      `El motivo admite máximo ${PEDIDO_CANCEL_MOTIVO_MAX} caracteres.`,
    ),
});

export type PedidoCancelFormValues = z.infer<typeof PedidoCancelFormSchema>;
