import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { getPreOrder, getPreOrderHistory, getPreOrders } from "../services/actions";

/**
 * La pre-orden cambia desde otras sesiones (almacén confirma, compras recibe,
 * otra OP consume material), así que se refresca al montar y al enfocar.
 */
const FRESHNESS = { staleTime: 0, refetchOnWindowFocus: true } as const;

export const usePreOrders = () => {
  const { data, hasLoaded, isLoading, isFetching, isInitialError, refetch } = useGuardedQuery(
    { queryKey: ["pre-orders", "list"], queryFn: () => getPreOrders(), ...FRESHNESS },
    { toastId: "pre-orders-refetch-error" },
  );
  return { preOrders: data ?? [], hasLoaded, isLoading, isFetching, isInitialError, refetch };
};

export const preOrderDetailQueryKey = (id: number | null) => ["pre-orders", "detail", id] as const;

export const usePreOrderDetail = (id: number | null) => {
  const { data, isLoading, isInitialError, isDefinitiveError, refetch } = useGuardedQuery(
    {
      queryKey: preOrderDetailQueryKey(id),
      queryFn: () => getPreOrder(id as number),
      enabled: id !== null && Number.isInteger(id) && id > 0,
      ...FRESHNESS,
    },
    { toastId: "pre-order-detail-refetch-error", isDefinitiveError: isNotFoundError },
  );
  return { data, isLoading, isInitialError, isDefinitiveError, refetch };
};

/**
 * Pre-orden de UN pedido (`?pedido=`). El detalle de pedidos especiales no
 * trae `pre_orden` (solo el listado), así que la hoja la busca por pedido.
 * `undefined` mientras carga; `null` si el pedido aún no tiene.
 */
export const usePreOrderByPedido = (pedidoId: number | null) => {
  const { data, hasLoaded } = useGuardedQuery(
    {
      queryKey: ["pre-orders", "by-pedido", pedidoId],
      queryFn: () => getPreOrders({ pedido: pedidoId as number }),
      enabled: pedidoId !== null && pedidoId > 0,
      ...FRESHNESS,
    },
    { toastId: "pre-order-by-pedido-refetch-error" },
  );
  if (!hasLoaded) return undefined;
  // La vigente primero: una cancelada solo si no hay otra.
  const list = data ?? [];
  return list.find((p) => p.estatus !== "cancelada") ?? list[0] ?? null;
};

export const usePreOrderHistory = (id: number) => {
  const { data, hasLoaded, isInitialError } = useGuardedQuery(
    { queryKey: ["pre-orders", "history", id], queryFn: () => getPreOrderHistory(id), ...FRESHNESS },
    { toastId: "pre-order-history-refetch-error" },
  );
  return { events: data ?? [], hasLoaded, isInitialError };
};
