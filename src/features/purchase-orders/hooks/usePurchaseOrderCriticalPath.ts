import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { getPurchaseOrderCriticalPath } from "../services/actions";
import type { PurchaseOrderCriticalPath } from "../interfaces/purchase-order-critical-path.interface";

export const purchaseOrderCriticalPathKey = (ocId: number) =>
  ["purchase-order-critical-path", ocId] as const;

/** ¿Es un id de OC consultable? Uno inválido nunca llega al backend. */
export const isValidPurchaseOrderId = (ocId: number) => Number.isInteger(ocId) && ocId > 0;

/**
 * Ruta crítica de UNA OC. Solo la usa el diálogo, que se MONTA al abrirse
 * (desde el listado o el detalle): nada más muestra estos datos, así que no
 * hay prefetch ni polling.
 *
 * `gcTime: 0`: al cerrar el diálogo la consulta sale de la caché, así que cada
 * apertura empieza sin datos y espera la lectura FRESCA (otra persona pudo
 * capturar mientras tanto) antes de montar el formulario: nunca toma como base
 * un valor viejo. Cumple el papel del `isFetchedAfterMount` del diálogo de OP,
 * que `useGuardedQuery` no expone.
 *
 * `refetchOnReconnect: false`: con el diálogo abierto no hay nada que ganar con
 * un refetch automático, y sí captura sin guardar que proteger.
 *
 * El 404 (OC de otra empresa, inactiva o inexistente) es definitivo: no se
 * reintenta ni avisa por toast (`isDefinitiveError`). Un refetch fallido tras
 * una carga correcta conserva lo cargado y avisa por toast.
 */
export const usePurchaseOrderCriticalPath = (ocId: number) => {
  const query = useGuardedQuery<PurchaseOrderCriticalPath>(
    {
      queryKey: purchaseOrderCriticalPathKey(ocId),
      queryFn: () => getPurchaseOrderCriticalPath(ocId),
      enabled: isValidPurchaseOrderId(ocId),
      gcTime: 0,
      refetchOnReconnect: false,
    },
    {
      toastId: "purchase-order-critical-path-refetch-error",
      isDefinitiveError: isNotFoundError,
    },
  );

  return {
    data: query.data,
    error: query.error,
    isInitialError: query.isInitialError,
    isDefinitiveError: query.isDefinitiveError,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
};
