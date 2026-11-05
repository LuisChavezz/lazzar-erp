"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { getQuoteComentarios, type QuoteResource } from "../services/actions";
import type { QuoteComentario } from "../interfaces/quote.interface";
import { otherQuoteResource, retainedQuoteComentarios } from "../utils/quoteResource";

/**
 * Raíz de la clave del historial. Rechazar y reenviar a revisión la invalidan
 * por prefijo (`[QUOTE_COMENTARIOS_KEY]` o `[QUOTE_COMENTARIOS_KEY, id]`).
 */
export const QUOTE_COMENTARIOS_KEY = "quote-comentarios";

/**
 * Historial de comentarios (rechazos y reenvíos) de una cotización, leído del
 * recurso que da `useQuote().comentariosResource` (`quoteComentariosResource`):
 * el que sirvió su detalle o, mientras no se sabe, el primero del orden de su
 * `source`. Nunca resuelve un respaldo por su cuenta, así que no puede divergir
 * del detalle. Sin recurso (detalle no disponible) la consulta queda apagada.
 *
 * Si el recurso cambia para la MISMA cotización (el detalle pasó a resolverse
 * por el otro), se sigue mostrando lo anterior mientras llega lo nuevo
 * (`placeholderData`), en vez de volver al esqueleto; y si la nueva lectura
 * falla sin ser definitiva (500, red), se conservan los comentarios que esa
 * misma cotización ya tenía leídos por el otro recurso
 * (`retainedQuoteComentarios`) en vez de cambiarlos por el error. Nunca se
 * muestran los de otra cotización: la clave lleva el id. La entrada del
 * recurso anterior queda sin observadores y TanStack la descarta al vencer su
 * `gcTime`.
 *
 * Devuelve `data` crudo: el consumidor distingue "aún no cargó" de "cargó
 * vacío". Un 404 es definitivo (la cotización no es visible por ese recurso):
 * no se reintenta ni avisa por toast.
 */
export const useQuoteComentarios = (
  quoteId: number,
  resource: QuoteResource | undefined
) => {
  const queryClient = useQueryClient();
  const query = useGuardedQuery<QuoteComentario[]>(
    {
      queryKey: [QUOTE_COMENTARIOS_KEY, quoteId, resource],
      queryFn: () => getQuoteComentarios(quoteId, resource!),
      enabled: Number.isFinite(quoteId) && quoteId > 0 && resource !== undefined,
      placeholderData: (previous, previousQuery) =>
        previousQuery?.queryKey[1] === quoteId ? previous : undefined,
    },
    {
      toastId: "quote-comentarios-refetch-error",
      errorMessage: "No se pudo actualizar el historial de la cotización",
      isDefinitiveError: isNotFoundError,
    },
  );
  const retained = retainedQuoteComentarios(
    query.isInitialError && resource !== undefined,
    resource === undefined
      ? undefined
      : queryClient.getQueryData<QuoteComentario[]>([
          QUOTE_COMENTARIOS_KEY,
          quoteId,
          otherQuoteResource(resource),
        ])
  );
  return retained === undefined
    ? query
    : { ...query, data: retained, isInitialError: false, error: null };
};
