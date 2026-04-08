/**
 * Construccion del contenido HTML del PDF de cotizacion.
 * Responsabilidad unica: renderizar el componente QuotePdf a un string HTML con estilos inline.
 */
import { createElement } from "react";
import { render } from "@react-email/render";
import QuotePdf from "@/src/pdfs/QuotePdf";
import type { QuoteById } from "../../interfaces/quote.interface";

/**
 * Renderiza el template PDF a HTML completo con estilos Tailwind inlineados.
 * El resultado puede ser consumido directamente por Puppeteer via `page.setContent()`.
 */
export const buildQuotePdfHtml = async (quote: QuoteById): Promise<string> => {
  return render(createElement(QuotePdf, { quote }));
};
