import { useQuery } from "@tanstack/react-query";
import { getOrders, type OrdersQueryParams } from "../services/actions";
import { Order } from "../interfaces/order.interface";

/**
 * Construye la queryKey de la lista de pedidos. Sin filtros conserva la clave
 * histórica `["orders"]` (la que ya invalidan varios módulos); con filtros
 * agrega los params para que React Query cachee cada variante por separado.
 */
export const ordersQueryKey = (params?: OrdersQueryParams) =>
  params ? (["orders", params] as const) : (["orders"] as const);

export const useOrders = (params?: OrdersQueryParams) => {
  const {
    data: orders = [],
    isLoading,
    isError,
    error,
  } = useQuery<Order[]>({
    queryKey: ordersQueryKey(params),
    // Envuelto en una arrow a propósito: pasar `getOrders` pelado haría que
    // React Query le inyectara su `QueryFunctionContext` como primer argumento
    // y este terminara viajando como `params` de axios.
    queryFn: () => getOrders(params),
  });

  return {
    orders,
    isLoading,
    isError,
    error,
  };
};

