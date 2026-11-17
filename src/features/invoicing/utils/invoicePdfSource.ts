import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderedDocumentPdfSource, type DocumentPdfSource } from "@/src/pdfs/shared/documentPdfSource";
import type { Invoice } from "../interfaces/invoice.interface";
import { getInvoiceDetail } from "../services/actions";
import { invoicePdfDescriptor } from "./invoicePdf";

/**
 * Fuente del PDF de una factura (EC-859). El retrieve se lee FRESCO con el
 * servicio, sin pasar por `["invoice-detail", id]`, la caché que observa la
 * página (regla de `renderedDocumentPdfSource`). Solo el retrieve trae el
 * receptor fiscal y la forma de pago (EC-904).
 */
export const invoicePdfSource = (options: {
  invoiceId: number;
  /** Arma el Blob; el botón pasa `generateInvoicePdfBlob`, las pruebas uno falso. */
  render: (invoice: Invoice, company: PdfCompany) => Promise<Blob>;
}): DocumentPdfSource =>
  renderedDocumentPdfSource({
    fetchDetail: () => getInvoiceDetail(options.invoiceId),
    describe: invoicePdfDescriptor,
    render: (invoice, { company }) => options.render(invoice, company),
  });
