import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getAccountingCustomers } from "../services/actions";
import { AccountingCustomer } from "../interfaces/accounting-customer.interface";

/**
 * Clientes de contabilidad, activos (por defecto) o dados de baja
 * (`activo: false`). La llave lleva `activo` (`["accounting-customers",
 * activo]`): cada vista es su propia entrada de caché, y las invalidaciones por
 * la raíz `["accounting-customers"]` alcanzan a las dos. Los selectores (p. ej.
 * el de cobros) llaman sin argumentos y siguen recibiendo solo activos.
 */
export const useAccountingCustomers = ({ activo = true }: { activo?: boolean } = {}) => {
  const { data, isLoading, isError, errorUpdatedAt, error, refetch, isFetching } = useQuery<
    AccountingCustomer[]
  >({
    queryKey: ["accounting-customers", activo],
    queryFn: () => getAccountingCustomers({ activo }),
  });

  const { hasLoaded } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "accounting-customers-refetch-error",
  });

  return {
    customers: data ?? [],
    hasLoaded,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  };
};
