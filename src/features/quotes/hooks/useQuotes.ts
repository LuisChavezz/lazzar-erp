import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getQuotes } from "../services/actions";
import { Quote, QuoteQueryParams } from "../interfaces/quote.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const useQuotes = (params?: QuoteQueryParams) => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery<Quote[]>(
    {
      queryKey: ["quotes", params ?? {}],
      queryFn: () => getQuotes(params),
    },
    { toastId: "quotes-refetch-error" },
  );

  const quotes = data ?? [];

  return {
    quotes,
    isLoading,
    isInitialError,
    error,
  };
};
