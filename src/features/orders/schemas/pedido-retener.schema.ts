import { z } from "zod";
import { countCodePoints } from "./pedido-programacion.schema";
import { PEDIDO_CANCEL_MOTIVO_MAX } from "./pedido-cancel.schema";

/**
 * Formulario de "Retener pedido". Misma medida del motivo que la cancelación
 * (`PEDIDO_CANCEL_MOTIVO_MAX`: 500 code points del texto recortado, como
 * `retener/` lo recorta en el backend), así que el campo reusa
 * `fitPedidoCancelMotivo` y `pedidoCancelMotivoLength`. Obligatorio: en blanco
 * el backend responde 400; se recorta antes de validar.
 */
export const PedidoRetenerFormSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(1, "Indica el motivo de la retención.")
    .refine(
      (value) => countCodePoints(value) <= PEDIDO_CANCEL_MOTIVO_MAX,
      `El motivo admite máximo ${PEDIDO_CANCEL_MOTIVO_MAX} caracteres.`,
    ),
});

export type PedidoRetenerFormValues = z.infer<typeof PedidoRetenerFormSchema>;
