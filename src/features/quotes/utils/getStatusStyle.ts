import { Quote } from "../interfaces/quote.interface";
import { QUOTE_STATUS_FALLBACK_CLS, getQuoteStatusConfig } from "../constants/quoteStatus";

type QuoteStatusLike = Pick<Quote, "estatus"> | Quote["estatus"] | null | undefined;

const resolveStatus = (status: QuoteStatusLike) => { // Resuelve el estado del pedido
  if (typeof status === "number") {
    return status;
  }
  if (!status || typeof status !== "object") {
    return null;
  }
  return typeof status.estatus === "number" ? status.estatus : null;
};

/**
 * Clases del badge de estatus de una cotización. Derivan de
 * `QUOTE_STATUS_CONFIG` (y este de `KANBAN_COLUMNS`): mismos colores que el
 * tablero. Un estatus ausente o desconocido cae al estilo neutro.
 */
export const getStatusStyles = (status: QuoteStatusLike) =>
  getQuoteStatusConfig(resolveStatus(status))?.cls ?? QUOTE_STATUS_FALLBACK_CLS;
