import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderedDocumentPdfSource, type DocumentPdfSource } from "@/src/pdfs/shared/documentPdfSource";
import type { CorteMangaOrder } from "../interfaces/corte-manga-order.interface";
import { getCorteMangaOrderDetail } from "../services/actions";
import { corteMangaOrderPdfDescriptor } from "./corteMangaOrderPdf";

/**
 * Fuente del PDF de una orden de corte de manga (EC-857). El detalle se lee
 * FRESCO con el servicio, sin pasar por `["corte-manga-order-detail", id]`, la
 * caché que observa la página (regla de `renderedDocumentPdfSource`).
 */
export const corteMangaOrderPdfSource = (options: {
  orderId: number;
  /** Arma el Blob; el botón pasa `generateCorteMangaOrderPdfBlob`, las pruebas uno falso. */
  render: (order: CorteMangaOrder, company: PdfCompany) => Promise<Blob>;
}): DocumentPdfSource =>
  renderedDocumentPdfSource({
    fetchDetail: () => getCorteMangaOrderDetail(options.orderId),
    describe: corteMangaOrderPdfDescriptor,
    render: (order, { company }) => options.render(order, company),
  });
