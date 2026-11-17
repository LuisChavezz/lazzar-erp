/**
 * Genera el Blob PDF de una factura (EC-859), con el documento y
 * `@react-pdf/renderer` en carga diferida (`renderPdfBlob`, EC-700). `company`
 * es la empresa activa.
 *
 * Es el MISMO generador que consumen "Descargar PDF" y el adjunto del correo al
 * cliente, por lo que el archivo enviado es idéntico al descargable.
 */
import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderPdfBlob } from "@/src/utils/renderPdfBlob";
import type { Invoice } from "../../interfaces/invoice.interface";

export const generateInvoicePdfBlob = (invoice: Invoice, company: PdfCompany | null): Promise<Blob> =>
  renderPdfBlob(
    () => import("@/src/pdfs/InvoicePdfDocument").then((m) => m.InvoicePdfDocument),
    { invoice, company },
  );
