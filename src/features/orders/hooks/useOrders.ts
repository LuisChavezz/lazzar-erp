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

export const useOrders = (params?: OrdersQueryParams) => {
  const { data, isLoading, isError, error } = useQuery<PedidoListItem[]>({
    queryKey: ordersQueryKey(params),
    // Envuelto en una arrow a propósito: pasar `getOrders` pelado haría que
    // React Query le inyectara su `QueryFunctionContext` como primer argumento
    // y este terminara viajando como `params` de axios.
    queryFn: () => getOrders(params),
  });

  // Un refetch fallido con datos en caché los conserva y avisa por toast. El
  // `toastId` es uno solo para todas las variantes de params: si varios
  // consumidores fallan a la vez, colapsan en un único toast.
  const { hasLoaded } = useHasLoadedQuery({
    data,
    isError,
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

