import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundOrForbiddenError } from "@/src/utils/drfWriteErrors";
import { getSupplierReturn } from "../services/actions";
import { supplierReturnDetailQueryKey } from "../constants/supplierReturns";
import type { SupplierReturn } from "../interfaces/supplier-return.interface";

/**
 * Detalle de UNA devolución (`GET /compras/devoluciones-proveedor/{id}/`), por
 * id: lo abren el listado y la bitácora. `0` = sin selección (consulta
 * apagada).
 *
 * El 404 (otra empresa o inexistente) y el 403 (sin `R-WMS-RECEPCIONES`) son
 * DEFINITIVOS: no se reintentan ni conservan lo cargado, y se exponen como
 * `isNotFound`. La llave cuelga de `["supplier-returns"]`, así que el alta y la
 * cancelación, que invalidan ese prefijo, también la releen.
 */
export const useSupplierReturnDetail = (id: number) => {
  const { data, isLoading, isInitialError, isDefinitiveError, error } = useGuardedQuery<SupplierReturn>(
    {
      queryKey: supplierReturnDetailQueryKey(id),
      queryFn: () => getSupplierReturn(id),
      enabled: id > 0,
    },
    {
      toastId: "supplier-return-detail-refetch-error",
      errorMessage: "No se pudo actualizar la devolución. Mostrando datos anteriores.",
      isDefinitiveError: isNotFoundOrForbiddenError,
    },
  );
  return { data, isLoading, isInitialError, isNotFound: isDefinitiveError, error };
};
