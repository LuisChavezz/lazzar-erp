import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { pickingDetailQueryKey } from "../constants/pickingQueryKeys";
import { getPickingDetail } from "../services/actions";
import { toPickingDetailData, type PickingDetailData } from "../utils/picking.utils";

/**
 * Detalle de un picking (`GET /wms/pickings/{id}/`). Llave
 * `["picking-detail", id]`; id nullable y `enabled` que mantiene la consulta
 * APAGADA sin un id válido.
 *
 * Va por `useGuardedQuery`:
 * - un refetch fallido con datos en caché los CONSERVA y avisa por toast
 *   (`isInitialError` solo si nunca cargó), así que el cuerpo del detalle —y un
 *   `PickingTransferDialog` abierto con su aviso— no se desmonta;
 * - el 404 (no existe o fuera de alcance) es un error DEFINITIVO
 *   (`isNotFound`): no se reintenta, no avisa por toast y no conserva lo cargado.
 */
export const usePickingDetail = (id: number | null) => {
  const { data, isLoading, isInitialError, isDefinitiveError, error } =
    useGuardedQuery<PickingDetailData>(
      {
        queryKey: pickingDetailQueryKey(id),
        queryFn: async () => toPickingDetailData(await getPickingDetail(id as number)),
        enabled: id !== null && id > 0,
      },
      {
        toastId: "picking-detail-refetch-error",
        errorMessage: "No se pudo actualizar el surtido. Se muestran los datos anteriores.",
        isDefinitiveError: isNotFoundError,
      },
    );

  return {
    picking: data?.picking,
    /** Instante de la lectura, para `mapPickingToRow`. 0 sin datos. */
    fetchedAt: data?.fetchedAt ?? 0,
    isLoading,
    isInitialError,
    isNotFound: isDefinitiveError,
    error,
  };
};
