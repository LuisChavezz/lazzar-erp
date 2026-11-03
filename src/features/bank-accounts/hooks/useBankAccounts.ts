import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getBankAccounts } from "../services/actions";
import { CuentaBancaria } from "../interfaces/bank-account.interface";

/**
 * Catálogo de cuentas bancarias. La respuesta es un arreglo plano (sin
 * paginación), así que el hook expone la lista completa y `DataTable` se encarga
 * de buscar, filtrar y paginar en memoria.
 *
 * `enabled: false` no dispara la consulta: lo usa quien lee el catálogo desde
 * OTRA sección sin `R-CONTABILIDAD` (lectura jerárquica, EC-734).
 */
export const useBankAccounts = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const { data, isLoading, isError, errorUpdatedAt, error, refetch, isFetching } = useQuery<
    CuentaBancaria[]
  >({
    queryKey: ["bank-accounts"],
    queryFn: getBankAccounts,
    enabled,
  });

  const { hasLoaded } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "bank-accounts-refetch-error",
  });

  return {
    bankAccounts: data ?? [],
    hasLoaded,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  };
};
