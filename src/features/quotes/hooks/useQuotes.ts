import { useQuery } from "@tanstack/react-query";
import { getQuotes } from "../services/actions";
import { Quote } from "../interfaces/quote.interface";

export const useQuotes = () => {
  const {
    data: quotes = [],
    isLoading,
    isError,
    error,
  } = useQuery<Quote[]>({
    queryKey: ["quotes"],
    queryFn: getQuotes,
  });

  return {
    quotes,
    isLoading,
    isError,
    error,
  };
};
