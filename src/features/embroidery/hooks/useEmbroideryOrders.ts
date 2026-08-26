import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getEmbroideryOrders } from "../services/actions";
import type { EmbroideryOrder } from "../interfaces/embroidery.interface";

/**
 * Lista las órdenes de bordado (`GET /produccion/orden-bordado/`).
 * Llave `["embroidery-orders"]`.
 *
 * `hasLoaded` distingue una carga inicial fallida (mostrar `ErrorState`) de un
 * refetch fallido con datos en caché (toast + conservar la tabla). Mismo
 * patrón que `usePackings`/`useShipments`.
 *
 * ORDEN: lo resuelve el backend, que devuelve el listado ya ordenado por
 * `-fecha_inicio, -id` (más reciente primero, con `-id` como desempate
 * estable). El hook conserva ese orden tal cual y no reordena en cliente: el
 * `sort` que antes vivía aquí replicaba exactamente esa misma clave mientras el
 * `queryset` no llevaba `order_by`, así que quedó redundante.
 */
export const useEmbroideryOrders = ({
  /**
   * Avisar por toast cuando un refetch falla teniendo datos en caché. Se apaga
   * desde consumidores que NO son la pantalla de bordado (p. ej. el dashboard
   * de manufactura, donde bordado es una tarjeta entre varias): ahí el toast
   * llegaría sin contexto de a qué módulo pertenece.
   */
  notifyOnRefetchError = true,
}: { notifyOnRefetchError?: boolean } = {}) => {
  const query = useQuery<EmbroideryOrder[]>({
    queryKey: ["embroidery-orders"],
    queryFn: getEmbroideryOrders,
  });

  const orders = query.data ?? [];

  const { hasLoaded } = useHasLoadedQuery({
    data: query.data,
    // `false` deja el efecto del toast sin disparar, conservando el cálculo de
    // `hasLoaded` (que solo depende de `data`).
    isError: notifyOnRefetchError && query.isError,
    toastId: "embroidery-orders-refetch-error",
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
