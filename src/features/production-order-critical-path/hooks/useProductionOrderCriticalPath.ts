import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { getProductionOrderCriticalPath } from "../services/actions";
import type { ProductionOrderCriticalPath } from "../interfaces/production-order-critical-path.interface";

export const PRODUCTION_ORDER_CRITICAL_PATH_KEY_ROOT = ["production-order-critical-path"] as const;

export const productionOrderCriticalPathKey = (opId: number) =>
  [...PRODUCTION_ORDER_CRITICAL_PATH_KEY_ROOT, opId] as const;

/** ¿Es un `op_id` consultable? Uno inválido nunca llega al backend. */
export const isValidOpId = (opId: number) => Number.isInteger(opId) && opId > 0;

/**
 * Ruta crítica de UNA OP. El hook solo se usa dentro del diálogo, que se MONTA
 * al abrirse: nada más muestra estos datos, así que no hay prefetch ni polling
 * (el GET no escribe; es una cuestión de no pedir lo que no se va a pintar).
 *
 * `refetchOnMount: "always"`: cada apertura trae el registro vigente aunque
 * haya uno en caché (otra persona pudo capturar mientras tanto); el diálogo
 * espera a esa lectura (`isFetchedAfterMount`) antes de montar el formulario,
 * para no tomar como base un valor viejo.
 *
 * `refetchOnReconnect: false`: con el diálogo abierto no hay nada que ganar con
 * un refetch automático, y sí captura sin guardar que proteger.
 *
 * `isInitialError` solo es `true` si nunca cargó: un refetch fallido conserva
 * lo cargado y avisa por toast (`useHasLoadedQuery`). Un 404 (OP inexistente o
 * de otra empresa) no se reintenta.
 */
export const useProductionOrderCriticalPath = (opId: number) => {
  const query = useQuery<ProductionOrderCriticalPath>({
    queryKey: productionOrderCriticalPathKey(opId),
    queryFn: () => getProductionOrderCriticalPath(opId),
    enabled: isValidOpId(opId),
    refetchOnMount: "always",
    refetchOnReconnect: false,
    retry: (failureCount, error) => !isNotFoundError(error) && failureCount < 1,
  });

  const { isInitialError } = useHasLoadedQuery({
    data: query.data,
    isError: query.isError,
    errorUpdatedAt: query.errorUpdatedAt,
    toastId: "production-order-critical-path-refetch-error",
  });

  return {
    data: query.data,
    error: query.error,
    isInitialError,
    isFetchedAfterMount: query.isFetchedAfterMount,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
};
