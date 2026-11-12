import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderedDocumentPdfSource, type DocumentPdfSource } from "@/src/pdfs/shared/documentPdfSource";
import type { EmbroideryOrderDetail } from "../interfaces/embroidery.interface";
import { getEmbroideryOrderDetail } from "../services/actions";
import { embroideryOrderPdfDescriptor } from "./embroideryOrderPdf";

/**
 * Fuente del PDF de una orden de bordado (EC-857). El detalle se lee FRESCO
 * con el servicio, sin pasar por `["embroidery-order-detail", id]`, la caché
 * que observa la página (regla de `renderedDocumentPdfSource`).
 */
export const embroideryOrderPdfSource = (options: {
  orderId: number;
  /** Arma el Blob; el botón pasa `generateEmbroideryOrderPdfBlob`, las pruebas uno falso. */
  render: (order: EmbroideryOrderDetail, company: PdfCompany) => Promise<Blob>;
}): DocumentPdfSource =>
  renderedDocumentPdfSource({
    fetchDetail: () => getEmbroideryOrderDetail(options.orderId),
    describe: embroideryOrderPdfDescriptor,
    render: (order, { company }) => options.render(order, company),
  });
