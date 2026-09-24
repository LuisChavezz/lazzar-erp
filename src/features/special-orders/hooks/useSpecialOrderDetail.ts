import { useQuery } from "@tanstack/react-query";
import { getSpecialOrderDetail } from "../services/actions";
import type { SpecialOrderDetail } from "../interfaces/special-order.interface";

/**
 * Detalle de un pedido especial (`GET /produccion/pedidos-especiales/{id}/`).
 * Llave `["special-order-detail", id]`.
 *
 * `enabled` mantiene la consulta APAGADA con un id nulo o inválido (mismo
 * patrón que `useCorteMangaOrderDetail`).
 */
export const useSpecialOrderDetail = (id: number | null) => {
  return useQuery<SpecialOrderDetail>({
    queryKey: ["special-order-detail", id],
    queryFn: () => getSpecialOrderDetail(id as number),
    enabled: id !== null && Number.isInteger(id) && id > 0,
  });
};
