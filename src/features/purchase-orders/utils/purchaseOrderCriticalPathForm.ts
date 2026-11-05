import type {
  PurchaseOrderCriticalPath,
  PurchaseOrderCriticalPathUpdateBody,
} from "../interfaces/purchase-order-critical-path.interface";
import type { PurchaseOrderCriticalPathValues } from "../schemas/purchase-order-critical-path.schema";
import { isForbiddenError } from "@/src/utils/drfWriteErrors";

/**
 * Envía el PATCH (`save`) y decide qué pasa si falla. El toast y los errores
 * por campo ya los dio la mutación; el formulario conserva lo capturado para
 * reintentar. Un 403 no se arregla reintentando: llama a `onForbidden` para
 * que el diálogo pase a solo lectura. Nunca rechaza.
 *
 * Cualquier 403 cuenta, también el del chequeo de origen del backend: tiene la
 * misma forma (`PermissionDenied`, `{"detail"}`, mismas cabeceras) y solo
 * cambia el texto, y el navegador no puede leerlo desde un origen fuera de la
 * lista de CORS, que es la misma que valida ese chequeo.
 */
export const submitPurchaseOrderCriticalPath = async (
  save: () => Promise<unknown>,
  onForbidden?: () => void,
): Promise<void> => {
  try {
    await save();
  } catch (error) {
    if (isForbiddenError(error)) onForbidden?.();
  }
};

/** Valores del formulario a partir del registro guardado (`null` → ""). */
export const toPurchaseOrderCriticalPathValues = (
  data: PurchaseOrderCriticalPath,
): PurchaseOrderCriticalPathValues => ({
  fecha_real_recibo: data.fecha_real_recibo ?? "",
  comentarios: data.comentarios ?? "",
});

/** Comentario como lo guarda el backend: recortado y `null` si queda vacío. */
const normalizeComentarios = (raw: string): string | null => raw.trim() || null;

/**
 * Cuerpo del PATCH con SOLO los campos que cambiaron respecto a la apertura.
 * Vacío = no hay nada que guardar.
 *
 * Solo viajan los cambios: así el PATCH no pisa lo que otra persona haya
 * guardado en el otro campo mientras el diálogo estaba abierto. El comentario
 * se compara normalizado, como lo guarda el backend: agregar solo espacios no
 * es un cambio.
 */
export const buildPurchaseOrderCriticalPathBody = (
  values: PurchaseOrderCriticalPathValues,
  initial: PurchaseOrderCriticalPathValues,
): PurchaseOrderCriticalPathUpdateBody => {
  const body: PurchaseOrderCriticalPathUpdateBody = {};

  if (values.fecha_real_recibo !== initial.fecha_real_recibo) {
    body.fecha_real_recibo = values.fecha_real_recibo || null;
  }

  const comentarios = normalizeComentarios(values.comentarios);
  if (comentarios !== normalizeComentarios(initial.comentarios)) {
    body.comentarios = comentarios;
  }

  return body;
};
