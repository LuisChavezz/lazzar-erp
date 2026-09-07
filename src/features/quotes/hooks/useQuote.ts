"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  getQuoteDetailById,
  type QuoteDetailSource,
} from "../services/actions";
import { QuoteById } from "../interfaces/quote.interface";

/**
 * Recurso por el que se PREGUNTA PRIMERO, no una elección excluyente: ante un
 * 404 `getQuoteDetailById` reintenta en el otro, que es donde vive el caso raro
 * de cada pantalla (ver ahí el porqué). `"cotizaciones"` es el de siempre;
 * `"mesa-control"` lo pasan las vistas cuyo usuario normalmente no es el
 * vendedor. La forma de la respuesta es la misma en ambos, así que comparten
 * hook, tipo y componente de detalle; solo cambia la clave de caché.
 */
export type { QuoteDetailSource };

export const getQuoteQueryOptions = (
  quoteId: number | null | undefined,
  source: QuoteDetailSource = "cotizaciones"
) =>
  queryOptions<QuoteById>({
    queryKey: ["quote", quoteId, source],
    queryFn: () => getQuoteDetailById(quoteId!, source),
  });

export const useQuote = (
  quoteId: number | null | undefined,
  source: QuoteDetailSource = "cotizaciones"
) => {
  return useQuery<QuoteById>({
    ...getQuoteQueryOptions(quoteId, source),
    enabled: Number.isFinite(quoteId) && Number(quoteId) > 0,
  });
};
