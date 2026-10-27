import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundOrForbiddenError } from "@/src/utils/drfWriteErrors";
import { getTransferenciaDetail } from "../services/actions";
import type { TransferenciaDetail } from "../interfaces/stock-transfer.interface";

/**
 * Lee el detalle de UN traspaso (`GET /wms/transferencias/{id}/`).
 *
 * `id: number` con `0` como valor centinela de "sin selección" (`enabled: id >
 * 0`) — mismo patrón que `useCuentaPorCobrarDetail`/`useStockMovementDetail`
 * (`0` nunca es un id real). El diálogo se monta solo al abrirse (ver
 * `StockTransfersColumns`) y SIEMPRE con el `id` real de la fila, así que
 * renderizar la tabla no dispara ninguna petición de detalle: `enabled` es la
 * segunda barrera, no la única.
 *
 * Llave con namespace propio (`["transferencia-detail", id]`), NO colgada del
 * prefijo `["transferencias"]` del listado: ese prefijo es exactamente el que
 * invalida `useCreateStockTransfer` al registrar un traspaso NUEVO, algo que
 * no tiene relación con refrescar el detalle YA ABIERTO de otro traspaso.
 * Mismo razonamiento que `useCuentaPorCobrarDetail`.
 *
 * **El 403 y el 404 son DEFINITIVOS** (`isNotFoundOrForbiddenError`, como en
 * `useSupplier`): no se reintentan ni conservan lo ya cargado, y se exponen
 * como `isNotFound`. El detalle también se abre desde un picking, cuyo usuario
 * puede no ver la TR (el listado de traspasos se acota por la sucursal de la
 * TR). Un refetch fallido por otra causa conserva los datos y avisa por toast.
 */
export const useTransferenciaDetail = (id: number) => {
  const { data, isLoading, isInitialError, isDefinitiveError, error } =
    useGuardedQuery<TransferenciaDetail>(
      {
        queryKey: ["transferencia-detail", id],
        queryFn: () => getTransferenciaDetail(id),
        enabled: id > 0,
      },
      {
        toastId: "transferencia-detail-refetch-error",
        errorMessage: "No se pudo actualizar el traspaso. Mostrando datos anteriores.",
        isDefinitiveError: isNotFoundOrForbiddenError,
      },
    );

  return { data, isLoading, isInitialError, isNotFound: isDefinitiveError, error };
};
