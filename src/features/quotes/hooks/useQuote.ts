"use client";

import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getQuoteDetailById } from "../services/actions";
import type { QuoteById } from "../interfaces/quote.interface";
import {
  isQuoteDetailDefinitiveError,
  quoteComentariosResource,
  type QuoteDetailSource,
  type QuoteResource,
} from "../utils/quoteResource";

/**
 * Recurso por el que se lee la cotización; obligatorio, sin valor por omisión
 * (ver `QuoteDetailSource`). La forma de la respuesta es la misma en todos,
 * así que comparten hook, tipo y componente de detalle; solo cambia el último
 * segmento de la clave de caché, y las invalidaciones por `["quote", id]`
 * alcanzan a todos.
 */
export type { QuoteDetailSource, QuoteResource };

/**
 * Consulta del detalle de una cotización.
 *
 * FORMA DE LA CACHÉ: `["quote", id, source]` guarda `{ data, resource }`
 * (`QuoteResourceRead<QuoteById>`), NO un `QuoteById` suelto: el detalle junto
 * con el recurso que lo sirvió, del que leen sus comentarios. Para leerla usa
 * `getQuoteFromCache`; un `setQueryData` debe escribir esa misma forma.
 */
export const getQuoteQueryOptions = (
  quoteId: number | null | undefined,
  source: QuoteDetailSource
) =>
  queryOptions({
    queryKey: ["quote", quoteId, source],
    queryFn: () => getQuoteDetailById(quoteId!, source),
  });

/** Cotización en caché para `quoteId` y `source`, o `undefined` si no hay. */
export const getQuoteFromCache = (
  queryClient: QueryClient,
  quoteId: number,
  source: QuoteDetailSource
): QuoteById | undefined =>
  queryClient.getQueryData(getQuoteQueryOptions(quoteId, source).queryKey)?.data;

interface UseQuoteOptions {
  /**
   * Texto del toast cuando una relectura falla con datos ya cargados. Por
   * omisión, el genérico de `useHasLoadedQuery`; el formulario de edición pasa
   * el suyo porque ahí lo que se ve son los cambios del usuario.
   */
  refetchErrorMessage?: string;
}

/**
 * Detalle de una cotización. El 404 y el 403 son definitivos
 * (`isQuoteDetailDefinitiveError`): no se reintentan, no avisan por toast y se
 * exponen en `isDefinitiveError`. El respaldo entre recursos sigue siendo solo
 * ante un 404 (`readQuoteResource`).
 *
 * - `resource`: el recurso que sirvió el detalle (`undefined` hasta saberlo).
 * - `comentariosResource`: del que leen sus comentarios
 *   (`quoteComentariosResource`): desde el primer render, para que arranquen
 *   junto con el detalle.
 */
export const useQuote = (
  quoteId: number | null | undefined,
  source: QuoteDetailSource,
  { refetchErrorMessage }: UseQuoteOptions = {}
) => {
  const { data, ...query } = useGuardedQuery(
    {
      ...getQuoteQueryOptions(quoteId, source),
      enabled: Number.isFinite(quoteId) && Number(quoteId) > 0,
    },
    {
      toastId: "quote-detail-refetch-error",
      errorMessage: refetchErrorMessage,
      isDefinitiveError: isQuoteDetailDefinitiveError,
    },
  );
  return {
    ...query,
    data: data?.data,
    resource: data?.resource,
    comentariosResource: quoteComentariosResource(source, data?.resource),
  };
};
