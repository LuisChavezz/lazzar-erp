import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getBankAccounts } from "../services/actions";
import { CuentaBancaria } from "../interfaces/bank-account.interface";

/**
 * Catálogo de cuentas bancarias. La respuesta es un arreglo plano (sin
 * paginación), así que el hook expone la lista completa y `DataTable` se encarga
 * de buscar, filtrar y paginar en memoria.
 */
export const useBankAccounts = () => {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<
    CuentaBancaria[]
  >({
    queryKey: ["bank-accounts"],
    queryFn: getBankAccounts,
  });

  const { hasLoaded } = useHasLoadedQuery({
    data,
    isError,
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
