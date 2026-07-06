import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getInvoices } from "../services/actions";
import { Invoice } from "../interfaces/invoice.interface";

export const useInvoices = () => {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<
    Invoice[]
  >({
    queryKey: ["invoices"],
    queryFn: getInvoices,
  });

  const { hasLoaded } = useHasLoadedQuery({
    data,
    isError,
    toastId: "invoices-refetch-error",
  });

  return {
    invoices: data ?? [],
    hasLoaded,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  };
};
