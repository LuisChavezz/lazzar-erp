import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getPayrolls } from "../services/actions";
import type { Payroll, PayrollListParams } from "../interfaces/payroll.interface";

/**
 * Raíz de la llave del recurso. Invalidar por este PREFIJO alcanza todas las
 * quincenas consultadas; toda escritura del módulo invalida por aquí.
 */
export const PAYROLL_KEY_ROOT = ["payroll"] as const;

/**
 * Nóminas de una quincena, filtradas EN EL SERVIDOR
 * (`periodo_inicio__gte`/`periodo_fin__lte`): el endpoint no pagina. Mismo
 * contrato que `useAttendance`: `params` va en la llave, el periodo previo se
 * conserva mientras llega el nuevo, e `isInitialError` solo si esta consulta
 * nunca cargó (un refetch fallido avisa por toast y conserva lo cargado).
 */
export const usePayrolls = (params: PayrollListParams) => {
  const {
    data,
    isLoading,
    isError,
    error,
    errorUpdatedAt,
    refetch,
    isFetching,
    isPlaceholderData,
  } = useQuery<Payroll[]>({
    queryKey: [...PAYROLL_KEY_ROOT, params],
    queryFn: () => getPayrolls(params),
    placeholderData: keepPreviousData,
  });

  const { hasLoaded, isInitialError } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "payroll-refetch-error",
  });

  return {
    payrolls: data ?? [],
    hasLoaded,
    isLoading,
    isInitialError,
    error: isInitialError ? error : null,
    refetch,
    isFetching,
    isPlaceholderData,
  };
};
