import type { QueryClient } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getPickingOnboarding } from "../services/actions";
import type {
  PickingOnboardingData,
  PickingOnboardingPedido,
} from "../interfaces/picking-onboarding.interface";
import { PICKING_ONBOARDING_LIST_KEY } from "./usePickingOnboarding";

/**
 * Llave EXACTA del onboarding sin pedido ni almacén: la misma que usa el Paso 1
 * de Nuevo Surtido (`usePickingOnboarding()`), así que ambos comparten caché y
 * una sola petición.
 */
const SCHEDULED_PEDIDOS_QUERY_KEY = [...PICKING_ONBOARDING_LIST_KEY, null] as const;

/**
 * Pedidos por surtir: los `pedidos` del onboarding de picking
 * (`GET /wms/pickings/onboarding/`), que el backend ya filtra a `activo`,
 * estatus 3/4 y con programación de Mesa de Control, acotados a la empresa y
 * sucursales del usuario (tope de 50, los más recientes). Es la ÚNICA fuente de
 * la lista de Pedidos de Almacén: no se cruza con `/ventas/pedidos/`.
 */
export const useScheduledPedidos = () => {
  const { data, hasLoaded, isLoading, isFetching, isInitialError, error, refetch } =
    useGuardedQuery<PickingOnboardingData, Error, PickingOnboardingPedido[]>(
      {
        queryKey: SCHEDULED_PEDIDOS_QUERY_KEY,
        queryFn: () => getPickingOnboarding(),
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

/**
 * Releer la lista de pedidos por surtir (y el catálogo del Paso 1 de Nuevo
 * Surtido, que es la misma consulta) tras una mutación que cambia qué pedidos
 * están programados o sus programaciones.
 */
export const invalidateScheduledPedidos = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: PICKING_ONBOARDING_LIST_KEY });
