import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getAccountingCustomers } from "../services/actions";
import { AccountingCustomer } from "../interfaces/accounting-customer.interface";

export const useAccountingCustomers = () => {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<
    AccountingCustomer[]
  >({
    queryKey: ["accounting-customers"],
    queryFn: getAccountingCustomers,
  });

  const { hasLoaded } = useHasLoadedQuery({
    data,
    isError,
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
