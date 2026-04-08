/**
 * Servicio principal del caso de uso "generar PDF de cotizacion".
 *
 * Orquesta el flujo completo:
 * 1. Consulta la cotizacion completa desde el backend.
 * 2. Renderiza el template HTML con estilos inlineados.
 * 3. Lanza Puppeteer, carga el HTML e imprime a PDF.
 * 4. Cierra el navegador y devuelve el buffer del PDF.
 */
import puppeteer from "puppeteer";
import { getQuoteByIdServer } from "../server-actions";
import { buildQuotePdfHtml } from "./quotePdfContent.server";

type GenerateQuotePdfParams = {
  quoteId: number;
  accessToken: string;
};

export const generateQuotePdf = async ({
  quoteId,
  accessToken,
}: GenerateQuotePdfParams): Promise<Buffer> => {
  const quote = await getQuoteByIdServer(quoteId, accessToken);
  const html = await buildQuotePdfHtml(quote);

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    // Carga el HTML con todos los estilos ya inline; no requiere recursos externos.
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "24px", right: "24px", bottom: "24px", left: "24px" },
    });

    return Buffer.from(pdf);
  } finally {
    // Garantiza el cierre del navegador aunque falle la generacion del PDF.
    await browser.close();
  }
};
