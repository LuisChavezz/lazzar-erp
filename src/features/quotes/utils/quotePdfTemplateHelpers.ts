/**
 * Builder del modelo que consume QuotePdfDocument.
 * Centraliza calculos y transformaciones para que el componente sea puramente presentacional.
 */
import { formatCurrency } from "@/src/utils/formatCurrency";
import type { QuoteById } from "../interfaces/quote.interface";
import {
  buildQuoteEmailDetailRows,
  getQuoteComputedSubtotal,
  getQuoteDetailSizesSummary,
  getQuoteTotalPieces,
  getQuoteShippingAddress,
} from "./quoteEmailTemplateHelpers";
import type { QuoteEmailDetailRow } from "./quoteEmailTemplateHelpers";
import { formatQuoteDateTime } from "./quoteDetailsFormatters";

export type QuotePdfModel = {
  customerName: string;
  formattedDate: string;
  totalPieces: number;
  shippingAddress: string;
  detailRows: QuoteEmailDetailRow[];
  sizesSummaries: string[];
  computedSubtotal: number;
  formatMoney: (amount: number) => string;
};

/** Arma el modelo completo listo para ser consumido por QuotePdfDocument. */
export const buildQuotePdfModel = (quote: QuoteById): QuotePdfModel => {
  const detailRows = buildQuoteEmailDetailRows(quote);

  return {
    customerName: quote.cliente_nombre || quote.cliente_razon_social || "-",
    formattedDate: formatQuoteDateTime(quote.created_at, "d 'de' MMMM yyyy"),
    totalPieces: getQuoteTotalPieces(quote),
    shippingAddress: getQuoteShippingAddress(quote),
    detailRows,
    sizesSummaries: detailRows.map(({ detail }) => getQuoteDetailSizesSummary(detail)),
    computedSubtotal: getQuoteComputedSubtotal(detailRows),
    formatMoney: (amount) => formatCurrency(amount),
  };
};
