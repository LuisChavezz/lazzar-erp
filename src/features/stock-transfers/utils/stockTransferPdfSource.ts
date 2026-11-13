import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderedDocumentPdfSource, type DocumentPdfSource } from "@/src/pdfs/shared/documentPdfSource";
import type { TransferenciaDetail } from "../interfaces/stock-transfer.interface";
import { getTransferenciaDetail } from "../services/actions";
import { stockTransferPdfDescriptor } from "./stockTransferPdf";

/**
 * Fuente del PDF de un traspaso (EC-858). El detalle se lee FRESCO con el
 * servicio, sin pasar por `["transferencia-detail", id]`, la caché que observa
 * `StockTransferDetailDialog` (regla de `renderedDocumentPdfSource`).
 */
export const stockTransferPdfSource = (options: {
  transferId: number;
  /** Arma el Blob; el botón pasa `generateStockTransferPdfBlob`, las pruebas uno falso. */
  render: (transfer: TransferenciaDetail, company: PdfCompany) => Promise<Blob>;
}): DocumentPdfSource =>
  renderedDocumentPdfSource({
    fetchDetail: () => getTransferenciaDetail(options.transferId),
    describe: stockTransferPdfDescriptor,
    render: (transfer, { company }) => options.render(transfer, company),
  });
