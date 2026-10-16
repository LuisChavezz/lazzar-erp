import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { getPurchaseOrderCriticalPath } from "../services/actions";
import type { PurchaseOrderCriticalPath } from "../interfaces/purchase-order-critical-path.interface";

export const purchaseOrderCriticalPathKey = (ocId: number) =>
  ["purchase-order-critical-path", ocId] as const;

/** ¿Es un id de OC consultable? Uno inválido nunca llega al backend. */
export const isValidPurchaseOrderId = (ocId: number) => Number.isInteger(ocId) && ocId > 0;

/**
 * Ruta crítica de UNA OC. Solo la usa el contenido del diálogo, que se MONTA
 * en cada apertura (desde el listado o el detalle): nada más muestra estos
 * datos, así que no hay prefetch ni polling.
 *
 * `refetchOnMount: "always"`: cada apertura trae el registro vigente aunque
 * haya uno en caché (otra persona pudo capturar, o un PATCH respondió después
 * de cerrar). El diálogo espera esa lectura (`isFetchedAfterMount`) antes de
 * montar el formulario, para no tomar como base un valor viejo. Mismo
 * mecanismo que la ruta crítica de OP.
 *
 * `refetchOnReconnect: false`: con el diálogo abierto no hay nada que ganar con
 * un refetch automático, y sí captura sin guardar que proteger.
 *
 * El 404 (OC de otra empresa, inactiva o inexistente) es definitivo: no se
 * reintenta ni avisa por toast (`isDefinitiveError`). Un refetch fallido tras
 * una carga correcta conserva lo cargado y avisa por toast.
 */
export const usePurchaseOrderCriticalPath = (ocId: number) =>
  useGuardedQuery<PurchaseOrderCriticalPath>(
    {
      queryKey: purchaseOrderCriticalPathKey(ocId),
      queryFn: () => getPurchaseOrderCriticalPath(ocId),
      enabled: isValidPurchaseOrderId(ocId),
      refetchOnMount: "always",
      refetchOnReconnect: false,
    },
    {
      toastId: "purchase-order-critical-path-refetch-error",
      isDefinitiveError: isNotFoundError,
    },
  );
