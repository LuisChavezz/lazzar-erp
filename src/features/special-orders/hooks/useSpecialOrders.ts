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
 *
 * DESVIACIÓN DELIBERADA de los defaults del QueryClient (15 min de
 * `staleTime`, sin refetch al enfocar): lo que alimenta esta lista cambia en
 * OTRA sesión —Mesa de Control autoriza cotizaciones y edita
 * clasificación/fecha desde su navegador—, así que ninguna invalidación local
 * lo alcanzaría. Con `staleTime: 0` la consulta se refresca al montar y, con
 * `refetchOnWindowFocus`, al volver a la pestaña.
 */
export const SPECIAL_ORDERS_FRESHNESS = {
  staleTime: 0,
  refetchOnWindowFocus: true,
} as const;

export const useSpecialOrders = () => {
  const query = useQuery<SpecialOrderListItem[]>({
    queryKey: ["special-orders"],
    queryFn: getSpecialOrders,
    ...SPECIAL_ORDERS_FRESHNESS,
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
