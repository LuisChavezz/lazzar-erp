import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getPedidoTrazabilidad } from "../services/actions";
import type { PedidoTrazabilidad } from "../interfaces/pedido-trazabilidad.interface";

/**
 * Llave con namespace propio, igual que `pedidoDetailQueryKey`: no cuelga de
 * `["orders"]` ni de `["pedido-detail"]`, así que cada mutación que cambia el
 * avance la invalida EXPLÍCITAMENTE (cabecera, edición de Mesa de Control,
 * programación y alta de factura).
 */
export const pedidoTrazabilidadQueryKey = (id: number) => ["pedido-trazabilidad", id] as const;

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
 */
export const usePedidoTrazabilidad = (id: number) => {
  const { data, isLoading, isError, isFetching, error, errorUpdatedAt, refetch } =
    useQuery<PedidoTrazabilidad>({
      queryKey: pedidoTrazabilidadQueryKey(id),
      // Arrow a propósito: con `getPedidoTrazabilidad` pelado React Query le
      // inyectaría su `QueryFunctionContext` como `id`.
      queryFn: () => getPedidoTrazabilidad(id),
      enabled: id > 0,
      refetchOnMount: "always",
    });

  const { hasLoaded, isInitialError } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "pedido-trazabilidad-refetch-error",
    errorMessage: "No se pudo actualizar la trazabilidad. Mostrando datos anteriores.",
  });

  return { data, hasLoaded, isInitialError, isLoading, isFetching, error, refetch };
};
