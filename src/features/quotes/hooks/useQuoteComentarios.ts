"use client";

import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { getQuoteComentarios, type QuoteResource } from "../services/actions";
import type { QuoteComentario } from "../interfaces/quote.interface";

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
 * del detalle.
 *
 * Si el recurso cambia para la MISMA cotización (el detalle pasó a resolverse
 * por el otro), se sigue mostrando lo anterior mientras llega lo nuevo
 * (`placeholderData`), en vez de volver al esqueleto; nunca se muestran los
 * comentarios de otra cotización. La entrada del recurso anterior queda sin
 * observadores y TanStack la descarta al vencer su `gcTime`.
 *
 * Devuelve `data` crudo: el consumidor distingue "aún no cargó" de "cargó
 * vacío". Un 404 es definitivo (la cotización no es visible por ese recurso):
 * no se reintenta ni avisa por toast.
 */
export const useQuoteComentarios = (quoteId: number, resource: QuoteResource) =>
  useGuardedQuery<QuoteComentario[]>(
    {
      queryKey: [QUOTE_COMENTARIOS_KEY, quoteId, resource],
      queryFn: () => getQuoteComentarios(quoteId, resource),
      enabled: Number.isFinite(quoteId) && quoteId > 0,
      placeholderData: (previous, previousQuery) =>
        previousQuery?.queryKey[1] === quoteId ? previous : undefined,
    },
    {
      toastId: "quote-comentarios-refetch-error",
      errorMessage: "No se pudo actualizar el historial de la cotización",
      isDefinitiveError: isNotFoundError,
    },
  );
