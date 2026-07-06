import { useQuery } from "@tanstack/react-query";
import { getAccountingCustomers } from "../services/actions";
import { AccountingCustomer } from "../interfaces/accounting-customer.interface";

export const useAccountingCustomers = () => {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<
    AccountingCustomer[]
  >({
    queryKey: ["accounting-customers"],
    queryFn: getAccountingCustomers,
  });

  // `data` solo se define tras una carga exitosa y se conserva aunque un
  // refetch posterior falle: distingue "cargó vacío" de "nunca cargó".
  const hasLoaded = data !== undefined;

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
