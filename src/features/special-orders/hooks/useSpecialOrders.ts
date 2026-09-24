import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getSpecialOrders } from "../services/actions";
import type { SpecialOrderListItem } from "../interfaces/special-order.interface";

/**
 * Lista los pedidos especiales (`GET /produccion/pedidos-especiales/`). Llave
 * `["special-orders"]`.
 *
 * `hasLoaded` distingue una carga inicial fallida (error en el cuerpo de la
 * tabla) de un refetch fallido con datos en caché (toast + conservar la tabla).
 * Mismo patrón que `useCorteMangaOrders`.
 *
 * ORDEN: el del servidor (`-fecha_confirmacion, -id`, pedidos sin confirmar
 * primero). No se reordena en cliente.
 */
export const useSpecialOrders = () => {
  const query = useQuery<SpecialOrderListItem[]>({
    queryKey: ["special-orders"],
    queryFn: getSpecialOrders,
  });

  const orders = query.data ?? [];

  const { hasLoaded } = useHasLoadedQuery({
    data: query.data,
    isError: query.isError,
    toastId: "special-orders-refetch-error",
  });

  return {
    orders,
    hasLoaded,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};
