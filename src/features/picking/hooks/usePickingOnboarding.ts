import { useQuery } from "@tanstack/react-query";
import { getPickingOnboarding } from "../services/actions";
import type { PickingOnboardingData } from "../interfaces/picking-onboarding.interface";

/**
 * Onboarding de picking (`GET /wms/pickings/onboarding/`).
 *
 * - `usePickingOnboarding()` / `usePickingOnboarding(null)` → solo selectores
 *   (pedidos/operadores/almacenes) para el Paso 1.
 * - `usePickingOnboarding(pedidoId)` → además el pendiente real por talla del
 *   pedido elegido, para el Paso 2.
 *
 * DESVIACIÓN DELIBERADA de los defaults de caché del proyecto (staleTime 15min)
 * — pero SOLO para la llamada con `pedidoId`: el backend advierte explícitamente
 * que el pendiente por talla puede reducirse entre que se carga el formulario y
 * se envía (otro operador/otra pestaña surte la misma talla). Para esa llamada
 * se fuerza `staleTime: 0` + `refetchOnMount: "always"` (cada vez que se entra
 * al Paso 2 se recargan pendientes frescos) y un `gcTime` corto. Ante los
 * errores de "ya no hay pendiente"/"excede lo pendiente" el Paso 2 dispara
 * además un `refetch()` manual (ver `usePickingStep2Form`).
 *
 * La llamada SIN `pedidoId` (solo selectores: pedidos/almacenes/operadores del
 * Paso 1) es un catálogo normal —tan estable como cualquier otro del
 * proyecto—, así que usa el `staleTime` global (15min): forzar un refetch cada
 * vez que se monta el Paso 1 (al abrir el diálogo o al "Regresar" desde el
 * Paso 2) no tiene ningún beneficio de frescura y solo agrega una petición.
 */
export const usePickingOnboarding = (
  pedidoId?: number | null,
  almacenOrigenId?: number | null,
) => {
  const normalizedPedidoId = pedidoId && pedidoId > 0 ? pedidoId : null;
  const normalizedAlmacenId =
    almacenOrigenId && almacenOrigenId > 0 ? almacenOrigenId : null;
  const isPedidoScoped = normalizedPedidoId !== null;

  const query = useQuery<PickingOnboardingData>({
    // El almacén forma parte de la llave: cambia las existencias por talla de
    // la respuesta, así que dos almacenes distintos no pueden compartir caché.
    queryKey: ["picking-onboarding", normalizedPedidoId, normalizedAlmacenId],
    queryFn: () => getPickingOnboarding(normalizedPedidoId, normalizedAlmacenId),
    ...(isPedidoScoped
      ? { staleTime: 0, gcTime: 30_000, refetchOnMount: "always" as const }
      : {}),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};
