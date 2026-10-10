import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getSpecialOrderDetail } from "../services/actions";
import type { SpecialOrderDetail } from "../interfaces/special-order.interface";
import { SPECIAL_ORDERS_FRESHNESS } from "./useSpecialOrders";

/**
 * Detalle de un pedido especial (`GET /produccion/pedidos-especiales/{id}/`).
 * Llave `["special-order-detail", id]`.
 *
 * `enabled` mantiene la consulta APAGADA con un id nulo o inválido (mismo
 * patrón que `useCorteMangaOrderDetail`). Misma frescura que el listado (ver
 * `SPECIAL_ORDERS_FRESHNESS`): el pedido se edita desde otras sesiones.
 *
 * No expone el `isError` crudo (`useGuardedQuery`): con `staleTime: 0` y
 * refetch al enfocar, esta consulta se vuelve a pedir a menudo, y un refetch
 * fallido conserva `data`. `isInitialError` solo es `true` si el detalle NUNCA
 * cargó; así la página —y el asistente de alta de SKU que monta— no se cambian
 * por un error cuando ya hay datos, solo se avisa por toast.
 */
export const useSpecialOrderDetail = (id: number | null) => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery<SpecialOrderDetail>(
    {
      queryKey: ["special-order-detail", id],
      queryFn: () => getSpecialOrderDetail(id as number),
      enabled: id !== null && Number.isInteger(id) && id > 0,
      ...SPECIAL_ORDERS_FRESHNESS,
    },
    { toastId: "special-order-detail-refetch-error" },
  );

  return { data, isLoading, isInitialError, error };
};
