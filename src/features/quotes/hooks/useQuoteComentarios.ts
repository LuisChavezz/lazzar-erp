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
 * recurso CONCRETO de su detalle (`useQuote().resource`): el fijo de su
 * `source` o el que resolvió su respaldo. Sin recurso todavía (el detalle con
 * respaldo aún no responde) la consulta queda apagada; nunca resuelve un
 * respaldo por su cuenta, así que no puede divergir del detalle.
 *
 * Devuelve `data` crudo: el consumidor distingue "aún no cargó" de "cargó
 * vacío". Un 404 es definitivo (la cotización no es visible por ese recurso):
 * no se reintenta ni avisa por toast.
 */
export const useQuoteComentarios = (
  quoteId: number,
  resource: QuoteResource | undefined
) =>
  useGuardedQuery<QuoteComentario[]>(
    {
      queryKey: [QUOTE_COMENTARIOS_KEY, quoteId, resource],
      queryFn: () => getQuoteComentarios(quoteId, resource!),
      enabled: Number.isFinite(quoteId) && quoteId > 0 && resource !== undefined,
    },
    {
      toastId: "quote-comentarios-refetch-error",
      errorMessage: "No se pudo actualizar el historial de la cotización",
      isDefinitiveError: isNotFoundError,
    },
  );
