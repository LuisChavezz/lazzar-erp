import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getCorteMangaOrders } from "../services/actions";
import type { CorteMangaOrder } from "../interfaces/corte-manga-order.interface";

/**
 * Lista las órdenes de corte de manga
 * (`GET /produccion/orden-corte-manga/`). Llave `["corte-manga-orders"]`.
 *
 * `hasLoaded` distingue una carga inicial fallida (mostrar el error en el
 * cuerpo de la tabla) de un refetch fallido con datos en caché (toast +
 * conservar la tabla). Mismo patrón que `useReflectiveOrders`/
 * `useEmbroideryOrders`/`usePackings`.
 *
 * ORDEN: lo resuelve el backend, que devuelve el listado ya ordenado por
 * `-fecha_inicio, -id` (más reciente primero, con `-id` como desempate
 * estable). El hook conserva ese orden tal cual y no reordena en cliente: el
 * `sort` que antes vivía aquí replicaba exactamente esa misma clave mientras el
 * `queryset` no llevaba `order_by`, así que quedó redundante.
 */
export const useCorteMangaOrders = () => {
  const query = useQuery<CorteMangaOrder[]>({
    queryKey: ["corte-manga-orders"],
    queryFn: getCorteMangaOrders,
  });

  const orders = query.data ?? [];

  const { hasLoaded } = useHasLoadedQuery({
    data: query.data,
    isError: query.isError,
    toastId: "corte-manga-orders-refetch-error",
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
