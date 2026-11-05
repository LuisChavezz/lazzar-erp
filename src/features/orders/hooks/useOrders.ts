import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getOrders, type OrdersQueryParams } from "../services/actions";
import { PedidoListItem } from "../interfaces/order.interface";
import { ORDERS_QUERY_KEY, ordersQueryKey } from "../constants/ordersQueryKeys";

// Las llaves viven en un módulo puro (sin React) para poder probarlas; se
// reexportan aquí porque es de donde las importan las mutaciones.
export { ORDERS_QUERY_KEY, ordersQueryKey };

/**
 * Llave y función de la lista completa de pedidos. Privadas del módulo a
 * propósito: nadie fuera de `useOrders` debe prefetchear la lista completa
 * (los selectores buscan en el servidor, `usePedidoSearch`).
 */
const ordersQueryOptions = (params?: OrdersQueryParams) => ({
  queryKey: ordersQueryKey(params),
  // Envuelto en una arrow a propósito: pasar `getOrders` pelado haría que
  // React Query le inyectara su `QueryFunctionContext` como primer argumento
  // y este terminara viajando como `params` de axios.
  queryFn: () => getOrders(params),
});

/**
 * Lista COMPLETA de pedidos. Solo para las vistas que todavía derivan algo del
 * conjunto entero (Mesa de Control, Compras › Pedidos, Programados, Mis
 * pedidos, CxC pendiente); un selector que solo busca un pedido usa
 * `usePedidoSearch`, que pide una página al servidor.
 *
 * `gcTime`: opcional, para que un consumidor alargue la vida en caché de la
 * lista (Compras y Mesa de Control pasan `LIST_QUERY_GC_TIME`); sin él, el global.
 */
export const useOrders = (params?: OrdersQueryParams, { gcTime }: { gcTime?: number } = {}) => {
  const { data, isLoading, isError, errorUpdatedAt, error } = useQuery<PedidoListItem[]>({
    ...ordersQueryOptions(params),
    // Solo si se pidió: un `gcTime: undefined` explícito pisaría el global.
    ...(gcTime !== undefined && { gcTime }),
  });

  // Un refetch fallido con datos en caché los conserva y avisa por toast. El
  // `toastId` es uno solo para todas las variantes de params: si varios
  // consumidores fallan a la vez, colapsan en un único toast.
  const { hasLoaded } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "orders-refetch-error",
  });

  return {
    orders: data ?? [],
    hasLoaded,
    isLoading,
    isError,
    error,
  };
};
