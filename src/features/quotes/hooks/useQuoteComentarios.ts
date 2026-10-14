"use client";

import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { getQuoteComentarios, type QuoteDetailSource } from "../services/actions";
import type { QuoteComentario } from "../interfaces/quote.interface";

/**
 * Raíz de la clave del historial. Rechazar y reenviar a revisión la invalidan
 * por prefijo (`[QUOTE_COMENTARIOS_KEY]` o `[QUOTE_COMENTARIOS_KEY, id]`).
 */
export const QUOTE_COMENTARIOS_KEY = "quote-comentarios";

/**
 * Historial de comentarios (rechazos y reenvíos) de una cotización. `source`
 * es el recurso por el que se pregunta primero, igual que en `useQuote`.
 *
 * Devuelve `data` crudo: el consumidor distingue "aún no cargó" de "cargó
 * vacío". Un 404 es definitivo (la cotización no es visible por ninguna de
 * las dos rutas): no se reintenta ni avisa por toast.
 */
export const useQuoteComentarios = (
  quoteId: number,
  source: QuoteDetailSource = "cotizaciones"
) =>
  useGuardedQuery<QuoteComentario[]>(
    {
      queryKey: [QUOTE_COMENTARIOS_KEY, quoteId, source],
      queryFn: () => getQuoteComentarios(quoteId, source),
      enabled: Number.isFinite(quoteId) && quoteId > 0,
    },
    {
      toastId: "quote-comentarios-refetch-error",
      errorMessage: "No se pudo actualizar el historial de la cotización",
      isDefinitiveError: isNotFoundError,
    },
  );
