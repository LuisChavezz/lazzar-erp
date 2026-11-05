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
 * debe ser el MISMO que el del detalle al que acompaña (`useQuote`): ambos
 * recursos tienen los mismos alcances que su detalle.
 *
 * Devuelve `data` crudo: el consumidor distingue "aún no cargó" de "cargó
 * vacío". Un 404 es definitivo (la cotización no es visible por ese recurso):
 * no se reintenta ni avisa por toast.
 */
export const useQuoteComentarios = (
  quoteId: number,
  source: QuoteDetailSource
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
