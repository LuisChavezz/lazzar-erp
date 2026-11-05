import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { isNotFoundOrForbiddenError } from "@/src/utils/drfWriteErrors";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import { getPedidoTrazabilidad } from "../services/actions";
import type { PedidoTrazabilidad } from "../interfaces/pedido-trazabilidad.interface";

/** Raíz de las llaves de la trazabilidad: invalidarla alcanza a TODOS los pedidos en caché. */
export const PEDIDO_TRAZABILIDAD_QUERY_ROOT = "pedido-trazabilidad";

/**
 * Llave con namespace propio, igual que `pedidoDetailQueryKey`: no cuelga de
 * `["orders"]` ni de `["pedido-detail"]`, así que cada mutación que cambia el
 * avance la invalida EXPLÍCITAMENTE: por id las del propio pedido (cabecera,
 * edición de Mesa de Control, programación, factura) y por raíz las de otros
 * módulos (`invalidatePedidoProgress`).
 */
export const pedidoTrazabilidadQueryKey = (id: number) =>
  [PEDIDO_TRAZABILIDAD_QUERY_ROOT, id] as const;

/**
 * Trazabilidad de un pedido (`GET /ventas/pedidos/{id}/trazabilidad/`).
 *
 * `refetchOnMount: "always"`: el backend la CALCULA en cada lectura a partir
 * de picking, empaque, embarque, órdenes de trabajo y facturas, y la mayoría de
 * esas altas ocurren en otras pantallas que no la invalidan. Con el `staleTime`
 * global de 15 min, volver al pedido mostraría el avance de hace minutos.
 *
 * Un refetch fallido con datos en caché los conserva y avisa por toast
 * (`useHasLoadedQuery`); solo un fallo SIN datos (`isInitialError`) se pinta
 * como error en la sección.
 *
 * `enabled` (EC-768): el detalle 360° monta este hook en la PÁGINA, desde el
 * primer render, para pedirla en paralelo con el pedido, y lo apaga mientras
 * la hoja activa no es la de Avances. TanStack no aplica `refetchOnMount` al
 * HABILITAR un observador ya montado (solo pide si la caché está vencida), así
 * que al pasar de apagado a encendido se relee aquí: cada vez que se abre la
 * hoja de Avances se lee de nuevo, como cuando la sección montaba su propio
 * observador. `cancelRefetch: false` se une a una lectura en vuelo en vez de
 * duplicarla.
 */
export const usePedidoTrazabilidad = (
  id: number,
  { enabled = true }: { enabled?: boolean } = {},
) => {
  const isEnabled = enabled && id > 0;
  const { data, isLoading, isError, isFetching, error, errorUpdatedAt, refetch } =
    useQuery<PedidoTrazabilidad>({
      queryKey: pedidoTrazabilidadQueryKey(id),
      // Arrow a propósito: con `getPedidoTrazabilidad` pelado React Query le
      // inyectaría su `QueryFunctionContext` como `id`.
      queryFn: () => getPedidoTrazabilidad(id),
      enabled: isEnabled,
      refetchOnMount: "always",
      // Un 404/403 (pedido inexistente, cancelado o de otra empresa) no cambia
      // al reintentarlo.
      retry: retryUnlessClientError,
    });

  const wasEnabledRef = useRef(isEnabled);
  useEffect(() => {
    const wasEnabled = wasEnabledRef.current;
    wasEnabledRef.current = isEnabled;
    if (isEnabled && !wasEnabled) void refetch({ cancelRefetch: false });
  }, [isEnabled, refetch]);

  const { hasLoaded, isInitialError } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "pedido-trazabilidad-refetch-error",
    errorMessage: "No se pudo actualizar la trazabilidad. Mostrando datos anteriores.",
    // Un 404/403 significa que el PEDIDO ya no está disponible: lo explica la
    // página ("Pedido no encontrado"), no un toast de la trazabilidad encima.
    silent: isNotFoundOrForbiddenError(error),
  });

  return { data, hasLoaded, isInitialError, isLoading, isFetching, error, refetch };
};

/** Lo que la página entrega a `OrderTraceabilitySection` (dueña única de la consulta). */
export type PedidoTrazabilidadQuery = ReturnType<typeof usePedidoTrazabilidad>;
