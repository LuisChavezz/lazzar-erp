import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundOrForbiddenError } from "@/src/utils/drfWriteErrors";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import { getSupplierKpiDetail } from "../services/actions";
import type { SupplierKpiDetail, SupplierKpiFactor } from "../interfaces/supplier-kpi-detail.interface";
import { supplierKpisQueryKey } from "./useSupplierKpis";

/**
 * Registros detrás de un factor del scorecard de un proveedor
 * (`GET /terceros/proveedores/{id}/kpis-detalle/?factor=…`).
 *
 * La llave cuelga de `supplierKpisQueryKey` (y así de `["purchase-orders"]`):
 * las mismas mutaciones que refrescan las tarjetas refrescan este detalle.
 * Una consulta por proveedor y factor: el diálogo solo monta la pestaña activa,
 * así que solo se pide el factor que se ve.
 *
 * `refetchOnMount: "always"`, como `useSupplierKpis`: el backend calcula estos
 * registros en cada lectura y el ranking del que se abren se relee al montar;
 * con el `staleTime` global el detalle podría ser más viejo que el puntaje que
 * explica.
 *
 * **Un 404 o un 403 es DEFINITIVO** (`isDefinitiveError`): el proveedor se dio
 * de baja o dejó de ser visible desde que cargó el ranking. No se reintenta ni
 * conserva lo ya cargado; la vista dice "no disponible". Cualquier otro fallo
 * sin datos es `isInitialError` (con su `error`, para leer el motivo de un
 * 4xx); un refetch fallido con datos los conserva y avisa por toast.
 */
export const useSupplierKpiDetail = <F extends SupplierKpiFactor>(supplierId: number, factor: F) => {
  const { data, isLoading, isFetching, isInitialError, isDefinitiveError, error, refetch } = useGuardedQuery<
    SupplierKpiDetail<F>
  >(
    {
      queryKey: [...supplierKpisQueryKey, "detail", supplierId, factor],
      queryFn: () => getSupplierKpiDetail(supplierId, factor),
      retry: retryUnlessClientError,
      refetchOnMount: "always",
    },
    {
      toastId: `supplier-kpi-detail-refetch-error-${factor}`,
      errorMessage: "No se pudo actualizar el detalle del proveedor. Mostrando datos anteriores.",
      isDefinitiveError: isNotFoundOrForbiddenError,
    },
  );

  return { data, isLoading, isFetching, isInitialError, isNotFound: isDefinitiveError, error, refetch };
};
