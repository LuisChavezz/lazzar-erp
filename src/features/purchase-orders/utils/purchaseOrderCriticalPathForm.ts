import type {
  PurchaseOrderCriticalPath,
  PurchaseOrderCriticalPathUpdateBody,
} from "../interfaces/purchase-order-critical-path.interface";
import type { PurchaseOrderCriticalPathValues } from "../schemas/purchase-order-critical-path.schema";

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
