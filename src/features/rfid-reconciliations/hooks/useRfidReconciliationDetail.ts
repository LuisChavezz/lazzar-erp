import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { getRfidReconciliation } from "../services/actions";
import { rfidReconciliationDetailQueryKey } from "../constants/rfidReconciliations";
import type { RfidReconciliation } from "../interfaces/rfid-reconciliation.interface";

/**
 * Detalle de UN encuadre (`GET .../{id}/`) con sus lecturas y su resumen, por
 * id: lo abren el listado, el alta y la bitácora. `0` = sin selección.
 *
 * El 404 (otra empresa o inexistente) es DEFINITIVO: no se reintenta ni
 * conserva lo cargado. Un 403 no ocurre: el detalle solo pide sesión. La llave
 * cuelga de `["rfid-reconciliations"]`, así que todo lo que invalida ese
 * prefijo también la relee.
 */
export const useRfidReconciliationDetail = (id: number) => {
  const { data, isLoading, isFetching, isInitialError, isDefinitiveError, error, refetch } =
    useGuardedQuery<RfidReconciliation>(
      {
        queryKey: rfidReconciliationDetailQueryKey(id),
        queryFn: () => getRfidReconciliation(id),
        enabled: id > 0,
      },
      {
        toastId: "rfid-reconciliation-detail-refetch-error",
        errorMessage: "No se pudo actualizar el encuadre. Mostrando datos anteriores.",
        isDefinitiveError: isNotFoundError,
      },
    );
  return { data, isLoading, isFetching, isInitialError, isNotFound: isDefinitiveError, error, refetch };
};
