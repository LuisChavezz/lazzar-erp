import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getOperationsCustomers } from "../services/actions";
import { OperationsCustomer } from "../interfaces/operations-customer.interface";

export const useOperationsCustomers = () => {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<
    OperationsCustomer[]
  >({
    queryKey: ["operations-customers"],
    queryFn: getOperationsCustomers,
  });

  const { hasLoaded } = useHasLoadedQuery({
    data,
    isError,
    toastId: "operations-customers-refetch-error",
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
