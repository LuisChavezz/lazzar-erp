/**
 * Genera el PDF de una factura en el cliente usando react-pdf y activa la
 * descarga.
 *
 * Responsabilidades:
 * - Renderizar el documento react-pdf a partir de una factura ya obtenida y
 *   convertirlo a Blob.
 * - Disparar la descarga nativa del navegador.
 *
 * Recibe la factura ya resuelta (no un id): la fila del listado
 * (`Invoice`) ya trae todos los campos del PDF —incluyendo
 * `factura_detalles`— por lo que no hace falta un GET de detalle adicional
 * (a diferencia de la orden de compra, cuyo listado es más ligero).
 */
import type { Invoice } from "../interfaces/invoice.interface";
import { generateInvoicePdfBlob } from "./pdf/invoicePdfBlob";

/**
 * Descarga el PDF de la factura indicada directamente desde el cliente.
 * No requiere API route ni funciones de servidor.
 */
export const downloadInvoicePdf = async (invoice: Invoice): Promise<void> => {
  const blob = await generateInvoicePdfBlob(invoice);

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  // El folio es más legible que el id para el nombre del archivo; si por algún
  // motivo viene vacío, se cae al id para no generar "factura-.pdf".
  link.download = `factura-${invoice.folio || invoice.id}.pdf`;
  link.click();
  URL.revokeObjectURL(objectUrl);
};
