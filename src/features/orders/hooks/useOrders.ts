import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getOrders, type OrdersQueryParams } from "../services/actions";
import { PedidoListItem } from "../interfaces/order.interface";

/**
 * Construye la queryKey de la lista de pedidos. Sin filtros conserva la clave
 * histórica `["orders"]` (la que ya invalidan varios módulos); con filtros
 * agrega los params para que React Query cachee cada variante por separado.
 */
export const ordersQueryKey = (params?: OrdersQueryParams) =>
  params ? (["orders", params] as const) : (["orders"] as const);

/**
 * Llave y función de la lista de pedidos, en UN solo lugar: las usan este hook
 * y quien prefetchea la misma lista (p. ej. el wizard de edición de OC), así
 * que lo prefetcheado es exactamente lo que el hook lee.
 */
export const ordersQueryOptions = (params?: OrdersQueryParams) => ({
  queryKey: ordersQueryKey(params),
  // Envuelto en una arrow a propósito: pasar `getOrders` pelado haría que
  // React Query le inyectara su `QueryFunctionContext` como primer argumento
  // y este terminara viajando como `params` de axios.
  queryFn: () => getOrders(params),
});

/**
 * `gcTime`: opcional, para que un consumidor alargue la vida en caché de la
 * lista (Compras pasa `PROCUREMENT_QUERY_GC_TIME`); sin él, el global.
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

