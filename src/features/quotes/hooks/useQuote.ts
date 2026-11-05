"use client";

import { queryOptions } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getQuoteDetailById } from "../services/actions";
import {
  fixedQuoteResource,
  isQuoteDetailDefinitiveError,
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
 * `resource` es el recurso del que deben leerse los comentarios: el fijo de
 * `source` desde el primer render —así arrancan junto con el detalle— o, si
 * `source` tiene respaldo, el que lo sirvió (`undefined` hasta saberlo).
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
    resource: fixedQuoteResource(source) ?? data?.resource,
  };
};
