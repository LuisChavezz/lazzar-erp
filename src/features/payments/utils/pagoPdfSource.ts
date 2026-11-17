import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderedDocumentPdfSource, type DocumentPdfSource } from "@/src/pdfs/shared/documentPdfSource";
import type { Pago } from "../interfaces/payment.interface";
import { getPago } from "../services/actions";
import { pagoPdfDescriptor } from "./pagoPdf";

/**
 * Fuente del PDF de un pago (EC-859). El diálogo pinta la fila del listado; el
 * PDF pide el retrieve FRESCO con el servicio, sin tocar `["pagos"]` (regla de
 * `renderedDocumentPdfSource`).
 */
export const pagoPdfSource = (options: {
  pagoId: number;
  /** Arma el Blob; el botón pasa `generatePagoPdfBlob`, las pruebas uno falso. */
  render: (pago: Pago, company: PdfCompany) => Promise<Blob>;
}): DocumentPdfSource =>
  renderedDocumentPdfSource({
    fetchDetail: () => getPago(options.pagoId),
    describe: pagoPdfDescriptor,
    render: (pago, { company }) => options.render(pago, company),
  });
