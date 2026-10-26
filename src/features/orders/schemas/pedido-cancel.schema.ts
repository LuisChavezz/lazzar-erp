import { z } from "zod";
import { countCodePoints } from "./pedido-programacion.schema";

/**
 * Largo con el que el backend recorta el motivo (`strip()` y luego `[:500]` en
 * la acción `cancelar`): 500 code points del texto RECORTADO, como Python. Es
 * la única medida del campo: el contador, el tope al escribir
 * (`clampPedidoCancelMotivo`) y el schema la usan igual, para que nada se
 * trunque en silencio. El `maxLength` nativo no sirve: cuenta unidades UTF-16
 * (un emoji vale dos) y también los espacios de los extremos.
 */
export const PEDIDO_CANCEL_MOTIVO_MAX = 500;

/** Code points del motivo tal como los cuenta el backend (recortado). */
export const pedidoCancelMotivoLength = (value: string): number =>
  countCodePoints(value.trim());

/**
 * Tope al escribir: si el texto recortado pasaría de
 * `PEDIDO_CANCEL_MOTIVO_MAX` code points, se corta lo que sobra al final
 * (conserva los espacios iniciales, que el backend descarta). Un texto dentro
 * del límite vuelve tal cual.
 */
export const clampPedidoCancelMotivo = (value: string): string => {
  if (pedidoCancelMotivoLength(value) <= PEDIDO_CANCEL_MOTIVO_MAX) return value;
  const leading = value.length - value.trimStart().length;
  const points = [...value.slice(leading)].slice(0, PEDIDO_CANCEL_MOTIVO_MAX);
  return value.slice(0, leading) + points.join("");
};

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

/** Schemas por campo, para la validación en blur. */
export const PedidoCancelFormFields = PedidoCancelFormSchema.shape;

export type PedidoCancelFormValues = z.infer<typeof PedidoCancelFormSchema>;
