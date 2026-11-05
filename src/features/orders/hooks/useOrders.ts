import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getOrders, type OrdersQueryParams } from "../services/actions";
import { PedidoListItem } from "../interfaces/order.interface";

/**
 * Prefijo de TODAS las consultas de `GET /ventas/pedidos/`: la lista completa
 * (`ordersQueryKey`), las búsquedas de los selectores
 * (`["orders", "search", …]`) y cualquier lista paginada que cuelgue de él.
 * Las mutaciones que cambian pedidos invalidan ESTE prefijo, nunca una llave
 * concreta, para refrescar todas las variantes a la vez.
 */
export const ORDERS_QUERY_KEY = ["orders"] as const;

/**
 * Llave de la lista COMPLETA (sin paginar) de pedidos, con sus filtros si los
 * hay. Va bajo `"full"` y no en el prefijo pelado: así ninguna búsqueda ni
 * página comparte llave con ella, y un `exact: true` sobre esta llave toca solo
 * esta variante. Para invalidar todo, `ORDERS_QUERY_KEY`.
 */
export const ordersQueryKey = (params?: OrdersQueryParams) =>
  params
    ? ([...ORDERS_QUERY_KEY, "full", params] as const)
    : ([...ORDERS_QUERY_KEY, "full"] as const);

/**
 * Llave y función de la lista completa de pedidos, en UN solo lugar: las usan
 * este hook y quien prefetchee la misma lista, así que lo prefetcheado es
 * exactamente lo que el hook lee.
 */
export const ordersQueryOptions = (params?: OrdersQueryParams) => ({
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
