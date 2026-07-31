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
 * patrón que `usePackings`/`useDispatches`.
 *
 * ORDEN: el endpoint no lleva `order_by` (ver `getEmbroideryOrders`), así que
 * se ordena aquí por `fecha_inicio` descendente con desempate por `id`
 * descendente — el mismo `-created_at, -id` que packing/despacho reciben ya
 * resuelto del backend, replicado en cliente. Se ordena en el hook (no en la
 * vista) para que la tabla reciba los datos ya en su orden por defecto y
 * cualquier `sorting` que elija el usuario en `DataTable` parta de ahí.
 *
 * Las fechas se comparan como INSTANTES (`Date.parse`), no como cadenas: DRF
 * omite la parte fraccionaria cuando los microsegundos son exactamente `0`, así
 * que dos altas del mismo segundo pueden serializarse como
 * `...T15:49:25-06:00` y `...T15:49:25.037413-06:00`; comparadas como texto,
 * `-` (0x2D) va antes que `.` (0x2E) y la más reciente quedaría primero al
 * revés. Un `offset` distinto entre filas rompe igual la comparación textual.
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

  // Se copia antes de ordenar: `sort` muta, y el arreglo es la referencia
  // viva de la caché de TanStack Query.
  const orders = [...(query.data ?? [])].sort((a, b) => {
    const fechaA = Date.parse(a.fecha_inicio);
    const fechaB = Date.parse(b.fecha_inicio);
    // Una fecha ilegible NO puede devolver `NaN` al comparador: `sort` con un
    // comparador que devuelve `NaN` deja el orden indefinido para TODO el
    // arreglo, no solo para esa fila. Se degrada al desempate por `id`, misma
    // degradación explícita que `pickingPrioridadRank`.
    const ambasValidas = Number.isFinite(fechaA) && Number.isFinite(fechaB);
    const diff = ambasValidas ? fechaB - fechaA : 0;
    return diff !== 0 ? diff : b.id - a.id;
  });

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
