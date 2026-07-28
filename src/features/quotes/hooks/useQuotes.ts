import { useQuery } from "@tanstack/react-query";
import { getQuotes } from "../services/actions";
import { Quote, QuoteQueryParams } from "../interfaces/quote.interface";

export const useQuotes = (params?: QuoteQueryParams) => {
  const {
    data: quotes = [],
    isLoading,
    isError,
    error,
  } = useQuery<Quote[]>({
    queryKey: ["quotes", params ?? {}],
    queryFn: () => getQuotes(params),
  });

  return {
    quotes,
    isLoading,
    isError,
    error,
  };
};
