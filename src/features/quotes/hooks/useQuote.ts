"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { getQuoteById } from "../services/actions";
import { QuoteById } from "../interfaces/quote.interface";

export const getQuoteQueryOptions = (quoteId: number | null | undefined) =>
  queryOptions<QuoteById>({
    queryKey: ["quote", quoteId],
    queryFn: () => getQuoteById(quoteId!),
  });

export const useQuote = (quoteId: number | null | undefined) => {
  return useQuery<QuoteById>({
    ...getQuoteQueryOptions(quoteId),
    enabled: Number.isFinite(quoteId) && Number(quoteId) > 0,
  });
};
