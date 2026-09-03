/**
 * Utilidades del árbol de errores y de normalización de partidas que comparten
 * los formularios construidos sobre `QuoteFormContent`.
 *
 * Lo consumen los TRES formularios construidos sobre `QuoteFormContent`: el
 * alta de cotización, su edición y la edición de pedidos por Mesa de Control.
 * Los dos primeros llevaban su copia privada; se compararon función por función
 * —ignorando comentarios y espacios— antes de unificar y solo diferían en
 * formato (una coma final, un `return` con llaves y un comentario suelto), así
 * que la unificación no cambia comportamiento en ninguno.
 */
import type { FormFieldError } from "@/src/utils/getFieldError";
import type { QuoteItem } from "../interfaces/quote.interface";

export type ErrorNode = {
  [key: string]: ErrorNode | FormFieldError | ErrorNode[] | undefined;
};

/**
 * Escribe `message` en `target` siguiendo `path`, creando objetos o arreglos
 * intermedios según el siguiente segmento sea nombre o índice.
 */
export const setErrorByPath = (
  target: ErrorNode,
  path: (string | number)[],
  message: string,
) => {
  if (path.length === 0) return;

  let current: ErrorNode | ErrorNode[] = target;
  path.forEach((rawSegment, index) => {
    const segment = String(rawSegment);
    const isLast = index === path.length - 1;

    if (Array.isArray(current)) {
      const numeric = Number(segment);
      const safeIndex = Number.isFinite(numeric) ? numeric : 0;
      if (!current[safeIndex]) current[safeIndex] = {};
      if (isLast) {
        (current[safeIndex] as ErrorNode).message = message as unknown as ErrorNode;
        return;
      }
      current = current[safeIndex] as ErrorNode;
      return;
    }

    if (isLast) {
      current[segment] = { message };
      return;
    }

    const nextSegment = String(path[index + 1]);
    const nextIsIndex = Number.isFinite(Number(nextSegment));
    const nextValue = current[segment];
    if (!nextValue || typeof nextValue !== "object") {
      current[segment] = nextIsIndex ? [] : {};
    }
    current = current[segment] as ErrorNode | ErrorNode[];
  });
};

/** Lee un valor anidado por ruta en dot/bracket notation. */
export const getPathValue = (source: unknown, path: string) => {
  if (!source || typeof source !== "object") return undefined;
  const tokens = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let current: unknown = source;
  for (const token of tokens) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[token];
  }
  return current;
};

/** Recalcula `importe` de una partida a partir de cantidad, precio y descuento. */
export const normalizeItem = (item: QuoteItem): QuoteItem => {
  const cantidad = Number(item.cantidad) || 0;
  const precio = Number(item.precio) || 0;
  const descuento = Number(item.descuento) || 0;
  const amount = cantidad * precio;
  const descuentoAmount = amount * (descuento / 100);
  const importe = Number((amount - descuentoAmount).toFixed(2));
  return { ...item, cantidad, precio, descuento, importe };
};
