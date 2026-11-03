/**
 * Genera un Blob PDF a partir de los datos de una cotizacion.
 *
 * El documento (y con él `@react-pdf/renderer`) se carga con `import()`
 * dinámico vía `renderPdfBlob`, para que la librería no entre en el chunk
 * inicial del listado de cotizaciones (EC-700). El modelo
 * (`buildQuotePdfModel`) es puro y ligero, así que sigue estático.
 *
 * `monedaCodigo`: código ISO de la moneda de la cotización
 * (`loadQuoteForDocument`); `null` pinta los importes sin símbolo.
 */
import type { QuoteById } from "../../interfaces/quote.interface";
import { buildQuotePdfModel } from "../../utils/quotePdfTemplateHelpers";
import { renderPdfBlob } from "@/src/utils/renderPdfBlob";

export const generateQuotePdfBlob = async (
  quote: QuoteById,
  monedaCodigo: string | null,
): Promise<Blob> =>
  renderPdfBlob(
    () => import("@/src/pdfs/QuotePdfDocument").then((m) => m.QuotePdfDocument),
    { quote, model: buildQuotePdfModel(quote, monedaCodigo) },
  );
