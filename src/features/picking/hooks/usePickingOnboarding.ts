import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { getPickingOnboarding } from "../services/actions";
import type { PickingOnboardingData } from "../interfaces/picking-onboarding.interface";
import { parsePickingError } from "../utils/parsePickingError";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";

/**
 * Prefijo de la llamada SIN pedido (el catálogo del Paso 1): coincide con
 * `["picking-onboarding", null, <almacén>]` y con ninguna llamada por pedido.
 */
export const PICKING_ONBOARDING_LIST_KEY = ["picking-onboarding", null] as const;

/**
 * Regla ÚNICA para un rechazo del backend al PEDIDO (clave `pedido`: ya no
 * está programado, cancelado, ajeno, "no encontrado o sin acceso"): ese pedido
 * ya no debe ofrecerse, así que se invalida el catálogo del Paso 1 para que al
 * "Regresar" llegue sin él. Se llama donde ocurre el error —el `onError` del
 * alta y el `queryFn` del onboarding por pedido—. Devuelve el mensaje del
 * backend, o `undefined` si el error no es de ese tipo.
 */
export const invalidateIfPedidoRejected = (
  queryClient: QueryClient,
  error: unknown,
): string | undefined => {
  const message = parsePickingError(error).fieldErrors.pedido;
  if (message) {
    void queryClient.invalidateQueries({ queryKey: PICKING_ONBOARDING_LIST_KEY });
  }
  return message;
};

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
 * La excepción es un rechazo del pedido (`invalidateIfPedidoRejected`).
 *
 * Un 4xx no se reintenta (`retryUnlessClientError`): el 400 de un pedido que
 * dejó de estar programado es definitivo y reintentarlo solo retrasa el error.
 */
export const usePickingOnboarding = (
  pedidoId?: number | null,
  almacenOrigenId?: number | null,
) => {
  const normalizedPedidoId = pedidoId && pedidoId > 0 ? pedidoId : null;
  const normalizedAlmacenId =
    almacenOrigenId && almacenOrigenId > 0 ? almacenOrigenId : null;
  const isPedidoScoped = normalizedPedidoId !== null;
  const queryClient = useQueryClient();

  const query = useQuery<PickingOnboardingData>({
    // El almacén forma parte de la llave: cambia las existencias por talla de
    // la respuesta, así que dos almacenes distintos no pueden compartir caché.
    queryKey: ["picking-onboarding", normalizedPedidoId, normalizedAlmacenId],
    queryFn: async () => {
      try {
        return await getPickingOnboarding(normalizedPedidoId, normalizedAlmacenId);
      } catch (error) {
        if (isPedidoScoped) invalidateIfPedidoRejected(queryClient, error);
        throw error;
      }
    },
    retry: retryUnlessClientError,
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
