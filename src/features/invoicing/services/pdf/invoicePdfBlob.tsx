/**
 * Genera un Blob PDF a partir de los datos de una factura.
 * Utiliza dynamic import de @react-pdf/renderer para evitar problemas en SSR.
 *
 * Es el MISMO generador que consume "Descargar PDF" y el adjunto del correo al
 * cliente, por lo que el archivo enviado es idéntico al descargable.
 */
import React from "react";
import type { Invoice } from "../../interfaces/invoice.interface";
import { InvoicePdfDocument } from "@/src/pdfs/InvoicePdfDocument";

export const generateInvoicePdfBlob = async (invoice: Invoice): Promise<Blob> => {
  const { pdf } = await import("@react-pdf/renderer");

  return pdf(<InvoicePdfDocument invoice={invoice} />).toBlob();
};
