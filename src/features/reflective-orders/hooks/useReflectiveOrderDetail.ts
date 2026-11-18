import { useQuery } from "@tanstack/react-query";
import { getReflectiveOrderDetail } from "../services/actions";
import type { ReflectiveOrderDetail } from "../interfaces/reflective-order.interface";

/** Llave del detalle; la comparte la mutación de edición para invalidarlo. */
/** Prefijo de los detalles de OR: invalida todos los abiertos. */
export const REFLECTIVE_ORDER_DETAIL_KEY = ["reflective-order-detail"] as const;

export const reflectiveOrderDetailQueryKey = (id: number | null) =>
  [...REFLECTIVE_ORDER_DETAIL_KEY, id] as const;

/**
 * Detalle de una orden de reflejante (`GET /produccion/orden-reflejante/{id}/`).
 * Llave `["reflective-order-detail", id]`.
 *
 * Mismo patrón que `useEmbroideryOrderDetail`/`useReceiptDetail`/`useQuote`: id
 * nullable y `enabled` que mantiene la consulta APAGADA mientras no haya una
 * orden seleccionada. `ReflectiveOrderDetailDialog` solo se monta con el diálogo
 * abierto, pero el `enabled` es lo que garantiza que un `id` nulo o inválido
 * —el que deja el diálogo al cerrarse— no dispare una petición.
 *
 * Este hook corrige una desviación, no la introduce: el diálogo de reflejante
 * recibía la fila del listado ya resuelta por la vista, apoyado en que `list` y
 * `retrieve` compartían `OrdenReflejanteSerializer`. Dejaron de compartirlo, así
 * que la fila ya no contiene el detalle (ver `getReflectiveOrderDetail`).
 */
export const useReflectiveOrderDetail = (id: number | null) => {
  return useQuery<ReflectiveOrderDetail>({
    queryKey: reflectiveOrderDetailQueryKey(id),
    queryFn: () => getReflectiveOrderDetail(id as number),
    enabled: id !== null && id > 0,
  });
};
