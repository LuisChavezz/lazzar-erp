import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderedDocumentPdfSource, type DocumentPdfSource } from "@/src/pdfs/shared/documentPdfSource";
import type { ReflectiveOrderDetail } from "../interfaces/reflective-order.interface";
import { getReflectiveOrderDetail } from "../services/actions";
import { reflectiveOrderPdfDescriptor } from "./reflectiveOrderPdf";

/**
 * Fuente del PDF de una orden de reflejante (EC-857). El detalle se lee FRESCO
 * con el servicio, sin pasar por `["reflective-order-detail", id]`, la caché
 * que observa la página (regla de `renderedDocumentPdfSource`).
 */
export const reflectiveOrderPdfSource = (options: {
  orderId: number;
  /** Arma el Blob; el botón pasa `generateReflectiveOrderPdfBlob`, las pruebas uno falso. */
  render: (order: ReflectiveOrderDetail, company: PdfCompany) => Promise<Blob>;
}): DocumentPdfSource =>
  renderedDocumentPdfSource({
    fetchDetail: () => getReflectiveOrderDetail(options.orderId),
    describe: reflectiveOrderPdfDescriptor,
    render: (order, { company }) => options.render(order, company),
  });
