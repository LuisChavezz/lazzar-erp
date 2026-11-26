import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getSupplierReturnPendientes } from "../services/actions";
import { supplierReturnPendientesQueryKey } from "../constants/supplierReturns";

/**
 * Lo que falta devolver de una inspección (`pendientes/?calidad_inspeccion=`).
 * `null` = sin inspección elegida (consulta apagada). Siempre se relee al
 * montarse: lo pendiente cambia con cada devolución y su cancelación, aunque
 * sea desde otra sesión, y el diálogo arma el envío con estas cantidades.
 */
export const useSupplierReturnPendientes = (inspectionId: number | null) => {
  const { data, isLoading, isFetching, isInitialError, error, refetch } = useGuardedQuery(
    {
      queryKey: supplierReturnPendientesQueryKey(inspectionId ?? 0),
      queryFn: () => getSupplierReturnPendientes(inspectionId ?? 0),
      enabled: inspectionId !== null && inspectionId > 0,
      refetchOnMount: "always",
    },
    { toastId: "supplier-return-pendientes-refetch-error" },
  );
  return { lines: data, isLoading, isFetching, isInitialError, error, refetch };
};
