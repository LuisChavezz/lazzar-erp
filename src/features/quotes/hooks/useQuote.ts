"use client";

import { useQuery } from "@tanstack/react-query";
import { getQuoteById } from "../services/actions";
import { QuoteById } from "../interfaces/quote.interface";

export const useQuote = (quoteId: number | null | undefined) => {
  return useQuery<QuoteById>({
    queryKey: ["quote", quoteId],
    queryFn: () => getQuoteById(quoteId!),
    enabled: Number.isFinite(quoteId) && Number(quoteId) > 0,
  });
};
