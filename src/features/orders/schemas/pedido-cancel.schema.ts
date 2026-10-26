import { z } from "zod";
import { countCodePoints } from "./pedido-programacion.schema";

/**
 * Largo con el que el backend recorta el motivo (`strip()` y luego `[:500]` en
 * la acción `cancelar`): 500 code points del texto RECORTADO, como Python. Es
 * la única medida del campo: el contador, el tope al escribir
 * (`fitPedidoCancelMotivo`) y el schema la usan igual, para que nada se
 * trunque en silencio. El `maxLength` nativo no sirve: cuenta unidades UTF-16
 * (un emoji vale dos) y también los espacios de los extremos.
 */
export const PEDIDO_CANCEL_MOTIVO_MAX = 500;

/** Code points del motivo tal como los cuenta el backend (recortado). */
export const pedidoCancelMotivoLength = (value: string): number =>
  countCodePoints(value.trim());

/**
 * Tope al escribir, como el `maxLength` nativo pero con la medida del backend:
 * si el cambio de `previous` a `next` dejaría el texto recortado por encima de
 * `PEDIDO_CANCEL_MOTIVO_MAX` code points, se conserva intacto lo que ya había
 * y de lo INSERTADO solo entra lo que cabe (nada, si ya estaba en el límite).
 * Devuelve el texto resultante y dónde queda el cursor (índice UTF-16 al final
 * de lo insertado), o `null` si el cambio cabe tal cual.
 */
export const fitPedidoCancelMotivo = (
  previous: string,
  next: string,
): { value: string; caret: number } | null => {
  if (pedidoCancelMotivoLength(next) <= PEDIDO_CANCEL_MOTIVO_MAX) return null;

  // Lo que cambió: lo común al inicio y al final se conserva.
  let prefix = 0;
  const maxPrefix = Math.min(previous.length, next.length);
  while (prefix < maxPrefix && previous[prefix] === next[prefix]) prefix++;
  let suffix = 0;
  const maxSuffix = Math.min(previous.length, next.length) - prefix;
  while (
    suffix < maxSuffix &&
    previous[previous.length - 1 - suffix] === next[next.length - 1 - suffix]
  ) {
    suffix++;
  }
  // No partir un par sustituto (un emoji) por la mitad.
  const isLowSurrogate = (text: string, index: number) => {
    const code = text.charCodeAt(index);
    return code >= 0xdc00 && code <= 0xdfff;
  };
  if (prefix > 0 && isLowSurrogate(next, prefix)) prefix--;
  if (suffix > 0 && isLowSurrogate(next, next.length - suffix)) suffix--;

  const head = previous.slice(0, prefix);
  const tail = previous.slice(previous.length - suffix);
  const inserted = [...next.slice(prefix, next.length - suffix)];

  // Lo más que cabe de lo insertado: añadir texto nunca acorta la medida, así
  // que basta una búsqueda binaria sobre cuántos code points entran.
  let low = 0;
  let high = inserted.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = head + inserted.slice(0, mid).join("") + tail;
    if (pedidoCancelMotivoLength(candidate) <= PEDIDO_CANCEL_MOTIVO_MAX) low = mid;
    else high = mid - 1;
  }
  const accepted = inserted.slice(0, low).join("");
  return { value: head + accepted + tail, caret: head.length + accepted.length };
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

export type PedidoCancelFormValues = z.infer<typeof PedidoCancelFormSchema>;
