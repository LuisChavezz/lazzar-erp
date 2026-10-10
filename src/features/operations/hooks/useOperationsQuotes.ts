"use client";

import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { OperationsQuote } from "../interfaces/operations-quote.interface";
import { getOperationsQuotes } from "../services/actions";

export const operationsQuotesQueryKey = ["operations-quotes"] as const;

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const useOperationsQuotes = () => {
  const { data, isLoading, isInitialError, error, refetch, isFetching } = useGuardedQuery<OperationsQuote[]>(
    {
      queryKey: operationsQuotesQueryKey,
      queryFn: getOperationsQuotes,
    },
    { toastId: "operations-quotes-refetch-error" },
  );

  const operationsQuotes = data ?? [];

  return {
    operationsQuotes,
    isLoading,
    isInitialError,
    error,
    refetch,
    isFetching,
  };
};