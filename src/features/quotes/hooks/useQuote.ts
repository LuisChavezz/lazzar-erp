"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { getQuoteDetailById } from "../services/actions";
import {
  fixedQuoteResource,
  type QuoteDetailSource,
  type QuoteResource,
} from "../utils/quoteResource";

/**
 * Recurso por el que se lee la cotización; obligatorio, sin valor por omisión
 * (ver `QuoteDetailSource`). La forma de la respuesta es la misma en todos,
 * así que comparten hook, tipo y componente de detalle; solo cambia el último
 * segmento de la clave de caché, y las invalidaciones por `["quote", id]`
 * alcanzan a todos.
 *
 * La caché guarda `{ data, resource }`: el detalle junto con el recurso que lo
 * sirvió, para que sus comentarios lean de ese mismo recurso.
 */
export type { QuoteDetailSource, QuoteResource };

export const getQuoteQueryOptions = (
  quoteId: number | null | undefined,
  source: QuoteDetailSource
) =>
  queryOptions({
    queryKey: ["quote", quoteId, source],
    queryFn: () => getQuoteDetailById(quoteId!, source),
  });

/**
 * Detalle de una cotización. `resource` es el recurso del que deben leerse los
 * comentarios: el fijo de `source` desde el primer render —así arrancan junto
 * con el detalle— o, si `source` tiene respaldo, el que lo sirvió
 * (`undefined` hasta saberlo).
 */
export const useQuote = (
  quoteId: number | null | undefined,
  source: QuoteDetailSource
) => {
  const { data, ...query } = useQuery({
    ...getQuoteQueryOptions(quoteId, source),
    enabled: Number.isFinite(quoteId) && Number(quoteId) > 0,
  });
  return {
    ...query,
    data: data?.data,
    resource: fixedQuoteResource(source) ?? data?.resource,
  };
};
