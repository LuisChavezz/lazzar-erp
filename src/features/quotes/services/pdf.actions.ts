/**
 * Genera el PDF de una cotizacion en el cliente usando react-pdf y activa la descarga.
 *
 * Responsabilidades:
 * - Obtener los datos de la cotizacion via el cliente API.
 * - Renderizar el documento react-pdf y convertirlo a Blob.
 * - Disparar la descarga nativa del navegador.
 */
import { getQuoteById } from "./actions";
import { generateQuotePdfBlob } from "./pdf/quotePdfBlob";
import { downloadBlob } from "@/src/utils/downloadBlob";

/**
 * Descarga el PDF de la cotizacion indicada directamente desde el cliente.
 * No requiere API route ni funciones de servidor.
 */
export const downloadQuotePdf = async (quoteId: number): Promise<void> => {
  const quote = await getQuoteById(quoteId);
  const blob = await generateQuotePdfBlob(quote);

  downloadBlob(blob, `cotizacion-${quoteId}.pdf`);
};
