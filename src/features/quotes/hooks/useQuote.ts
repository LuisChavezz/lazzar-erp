"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  getQuoteDetailById,
  type QuoteDetailSource,
} from "../services/actions";
import { QuoteById } from "../interfaces/quote.interface";

/**
 * Recurso por el que se lee la cotización; obligatorio, sin valor por omisión
 * (ver `QuoteDetailSource`). La forma de la respuesta es la misma en todos,
 * así que comparten hook, tipo y componente de detalle; solo cambia el último
 * segmento de la clave de caché, y las invalidaciones por `["quote", id]`
 * alcanzan a todos.
 */
export type { QuoteDetailSource };

export const getQuoteQueryOptions = (
  quoteId: number | null | undefined,
  source: QuoteDetailSource
) =>
  queryOptions<QuoteById>({
    queryKey: ["quote", quoteId, source],
    queryFn: () => getQuoteDetailById(quoteId!, source),
  });

export const useQuote = (
  quoteId: number | null | undefined,
  source: QuoteDetailSource
) => {
  return useQuery<QuoteById>({
    ...getQuoteQueryOptions(quoteId, source),
    enabled: Number.isFinite(quoteId) && Number(quoteId) > 0,
  });
};
