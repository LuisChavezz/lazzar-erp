/**
 * Genera un Blob PDF a partir de los datos de una cotizacion.
 * Utiliza dynamic import de @react-pdf/renderer para evitar problemas en SSR.
 */
import React from "react";
import type { QuoteById } from "../../interfaces/quote.interface";
import { buildQuotePdfModel } from "../../utils/quotePdfTemplateHelpers";
import { QuotePdfDocument } from "@/src/pdfs/QuotePdfDocument";

export const generateQuotePdfBlob = async (quote: QuoteById): Promise<Blob> => {
  const { pdf } = await import("@react-pdf/renderer");

  const model = buildQuotePdfModel(quote);

  return pdf(<QuotePdfDocument quote={quote} model={model} />).toBlob();
};
