import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderedDocumentPdfSource, type DocumentPdfSource } from "@/src/pdfs/shared/documentPdfSource";
import type { FacturaProveedor } from "../interfaces/supplier-invoice.interface";
import { getSupplierInvoice } from "../services/actions";
import { supplierInvoicePdfDescriptor } from "./supplierInvoicePdf";

/**
 * Fuente del PDF de una factura de proveedor (EC-859). El diálogo pinta la fila
 * del listado; el PDF pide el retrieve FRESCO con el servicio (el listado no
 * es una caché que deba tocar, regla de `renderedDocumentPdfSource`).
 */
export const supplierInvoicePdfSource = (options: {
  facturaId: number;
  /** Arma el Blob; el botón pasa `generateSupplierInvoicePdfBlob`, las pruebas uno falso. */
  render: (factura: FacturaProveedor, company: PdfCompany) => Promise<Blob>;
}): DocumentPdfSource =>
  renderedDocumentPdfSource({
    fetchDetail: () => getSupplierInvoice(options.facturaId),
    describe: supplierInvoicePdfDescriptor,
    render: (factura, { company }) => options.render(factura, company),
  });
