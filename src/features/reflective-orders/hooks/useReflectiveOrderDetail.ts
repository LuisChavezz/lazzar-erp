import { useQuery } from "@tanstack/react-query";
import { getReflectiveOrderDetail } from "../services/actions";
import type { ReflectiveOrderDetail } from "../interfaces/reflective-order.interface";

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
    queryKey: ["reflective-order-detail", id],
    queryFn: () => getReflectiveOrderDetail(id as number),
    enabled: id !== null && id > 0,
  });
};
