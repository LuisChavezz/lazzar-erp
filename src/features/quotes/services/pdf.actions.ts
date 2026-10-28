/**
 * Genera el PDF de una cotizacion en el cliente usando react-pdf y activa la descarga.
 *
 * Responsabilidades:
 * - Renderizar el documento react-pdf y convertirlo a Blob.
 * - Disparar la descarga nativa del navegador.
 *
 * La cotización y el código de su moneda los obtiene quien llama
 * (`useDownloadQuotePdf`), que tiene el `queryClient` para esperar el catálogo
 * de monedas.
 */
import type { QuoteById } from "../interfaces/quote.interface";
import { generateQuotePdfBlob } from "./pdf/quotePdfBlob";
import { downloadBlob } from "@/src/utils/downloadBlob";

/**
 * Descarga el PDF de la cotizacion indicada directamente desde el cliente.
 * No requiere API route ni funciones de servidor.
 */
export const downloadQuotePdf = async (
  quote: QuoteById,
  monedaCodigo: string | null,
): Promise<void> => {
  const blob = await generateQuotePdfBlob(quote, monedaCodigo);

  downloadBlob(blob, `cotizacion-${quote.id}.pdf`);
};
