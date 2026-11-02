import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getPickingOnboarding } from "../services/actions";
import type {
  PickingOnboardingData,
  PickingOnboardingPedido,
} from "../interfaces/picking-onboarding.interface";
import {
  PICKING_ONBOARDING_LIST_KEY,
  retryUnlessDefinitiveRejection,
} from "./usePickingOnboarding";

export { invalidateScheduledPedidos } from "./usePickingOnboarding";

/**
 * Llave EXACTA del onboarding sin pedido ni almacén: la misma que usa el Paso 1
 * de Nuevo Surtido (`usePickingOnboarding()`), así que ambos comparten caché y
 * una sola petición. Por eso también comparten la política de reintento: en una
 * misma consulta, la última opción montada gana.
 */
const SCHEDULED_PEDIDOS_QUERY_KEY = [...PICKING_ONBOARDING_LIST_KEY, null] as const;

/**
 * Tope de `pedidos` del listado del onboarding: el backend devuelve solo los 50
 * más recientes (`cargar_catalogos`, `order_by("-id")` + `[:50]`) sin total ni
 * paginación. Con esa cantidad puede haber más programados que no llegaron.
 */
export const SCHEDULED_PEDIDOS_LIMIT = 50;

/**
 * Pedidos por surtir: los `pedidos` del onboarding de picking
 * (`GET /wms/pickings/onboarding/`), que el backend ya filtra a `activo`,
 * estatus 3/4 y con programación de Mesa de Control, acotados a la empresa y
 * sucursales del usuario (tope `SCHEDULED_PEDIDOS_LIMIT`, los más recientes).
 * Es la ÚNICA fuente de la lista de Pedidos de Almacén: no se cruza con
 * `/ventas/pedidos/`.
 */
export const useScheduledPedidos = () => {
  const { data, hasLoaded, isLoading, isFetching, isInitialError, error, refetch } =
    useGuardedQuery<PickingOnboardingData, Error, PickingOnboardingPedido[]>(
      {
        queryKey: SCHEDULED_PEDIDOS_QUERY_KEY,
        queryFn: () => getPickingOnboarding(),
        retry: retryUnlessDefinitiveRejection,
        select: (onboarding) => onboarding.pedidos,
      },
      { toastId: "scheduled-pedidos-refetch-error" },
    );

  return {
    pedidos: data ?? [],
    hasLoaded,
    isLoading,
    isFetching,
    isInitialError,
    error,
    refetch,
  };
};
