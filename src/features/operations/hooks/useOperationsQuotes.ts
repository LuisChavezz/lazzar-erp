"use client";

import { useQuery } from "@tanstack/react-query";
import { OperationsQuote } from "../interfaces/operations-quote.interface";
import { getOperationsQuotes } from "../services/actions";

export const operationsQuotesQueryKey = ["operations-quotes"] as const;

export const useOperationsQuotes = () => {
  const {
    data: operationsQuotes = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<OperationsQuote[]>({
    queryKey: operationsQuotesQueryKey,
    queryFn: getOperationsQuotes,
  });

  return {
    operationsQuotes,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  };
};