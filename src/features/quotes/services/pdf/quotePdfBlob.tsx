/**
 * Genera un Blob PDF a partir de los datos de una cotizacion.
 * Utiliza dynamic import de @react-pdf/renderer para evitar problemas en SSR.
 *
 * `monedaCodigo`: código ISO de la moneda de la cotización
 * (`loadQuoteForDocument`); `null` pinta los importes sin símbolo.
 */
import React from "react";
import type { QuoteById } from "../../interfaces/quote.interface";
import { buildQuotePdfModel } from "../../utils/quotePdfTemplateHelpers";
import { QuotePdfDocument } from "@/src/pdfs/QuotePdfDocument";

export const generateQuotePdfBlob = async (
  quote: QuoteById,
  monedaCodigo: string | null,
): Promise<Blob> => {
  const { pdf } = await import("@react-pdf/renderer");

  const model = buildQuotePdfModel(quote, monedaCodigo);

  return pdf(<QuotePdfDocument quote={quote} model={model} />).toBlob();
};
