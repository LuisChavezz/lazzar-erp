import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getReflectiveOrders } from "../services/actions";
import type { ReflectiveOrder } from "../interfaces/reflective-order.interface";

/**
 * Lista las órdenes de reflejante (`GET /produccion/orden-reflejante/`).
 * Llave `["reflective-orders"]`.
 *
 * `hasLoaded` distingue una carga inicial fallida (mostrar `ErrorState`) de un
 * refetch fallido con datos en caché (toast + conservar la tabla). Mismo patrón
 * que `useEmbroideryOrders`/`usePackings`.
 *
 * Sin la opción `notifyOnRefetchError` que sí tiene `useEmbroideryOrders`: ahí
 * existe porque el dashboard de manufactura consume el mismo hook y el toast
 * llegaría sin contexto de módulo. Reflejante tiene un único consumidor (su
 * propia pantalla), así que el parámetro sería un grado de libertad que nadie
 * usa; se agrega si aparece un segundo consumidor.
 *
 * ORDEN: lo resuelve el backend, que devuelve el listado ya ordenado por
 * `-fecha_inicio, -id` (más reciente primero, con `-id` como desempate
 * estable). El hook conserva ese orden tal cual y no reordena en cliente: el
 * `sort` que antes vivía aquí replicaba exactamente esa misma clave mientras el
 * `queryset` no llevaba `order_by`, así que quedó redundante.
 */
export const useReflectiveOrders = () => {
  const query = useQuery<ReflectiveOrder[]>({
    queryKey: ["reflective-orders"],
    queryFn: getReflectiveOrders,
  });

  const orders = query.data ?? [];

  const { hasLoaded } = useHasLoadedQuery({
    data: query.data,
    isError: query.isError,
    toastId: "reflective-orders-refetch-error",
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
