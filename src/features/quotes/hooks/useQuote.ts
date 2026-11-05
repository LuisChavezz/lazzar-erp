"use client";

import { useSyncExternalStore } from "react";
import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getQuoteDetailById } from "../services/actions";
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
 * con el recurso que lo sirvió, del que leen sus comentarios. Un
 * `getQueryData` lee esa forma y un `setQueryData` debe escribirla igual.
 */
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
 * - `latestError`: el error de la ÚLTIMA lectura (`null` tras una exitosa),
 *   leído del estado de la consulta. `isDefinitiveError` en cambio sigue en
 *   `true` hasta una respuesta exitosa aunque el fallo más reciente sea otro;
 *   quien decide qué hacer con el último fallo (el formulario de edición) usa
 *   este.
 * - `comentariosResource`: del que leen sus comentarios
 *   (`quoteComentariosResource`): desde el primer render, para que arranquen
 *   junto con el detalle; `undefined` si el detalle no está disponible.
 */
export const useQuote = (
  quoteId: number | null | undefined,
  source: QuoteDetailSource,
  { refetchErrorMessage }: UseQuoteOptions = {}
) => {
  const queryClient = useQueryClient();
  const options = getQuoteQueryOptions(quoteId, source);
  const { data, ...query } = useGuardedQuery(
    {
      ...options,
      enabled: Number.isFinite(quoteId) && Number(quoteId) > 0,
    },
    {
      toastId: "quote-detail-refetch-error",
      errorMessage: refetchErrorMessage,
      isDefinitiveError: isQuoteDetailDefinitiveError,
    },
  );
  const latestError = useSyncExternalStore(
    (onChange) => queryClient.getQueryCache().subscribe(onChange),
    () => queryClient.getQueryState(options.queryKey)?.error ?? null,
    () => null,
  );
  return {
    ...query,
    data: data?.data,
    latestError,
    comentariosResource: quoteComentariosResource(
      source,
      data?.resource,
      query.isDefinitiveError
    ),
  };
};
