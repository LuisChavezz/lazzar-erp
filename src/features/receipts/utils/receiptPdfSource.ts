import type { QueryClient } from "@tanstack/react-query";
import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderedDocumentPdfSource, type DocumentPdfSource } from "@/src/pdfs/shared/documentPdfSource";
import type { ReceiptDetail } from "../interfaces/receipt.interface";
import { getReceiptDetail } from "../services/actions";
import { receiptPdfDescriptor } from "./receiptPdf";

interface ReceiptPdfSourceOptions {
  /**
   * El QueryClient de la app, el mismo cuya consulta `["receipt-detail", id]`
   * observa el diálogo. La fuente NO debe escribir en ella: lo recibe para que
   * esa regla se pueda comprobar (`tests/unit/receipt-pdf.spec.ts` le pasa un
   * cliente con el diálogo ya cargado y revisa que quede intacto).
   */
  queryClient: QueryClient;
  receiptId: number;
  /** Arma el Blob; el botón pasa `generateReceiptPdfBlob`, las pruebas uno falso. */
  render: (detail: ReceiptDetail, company: PdfCompany) => Promise<Blob>;
}

/**
 * Fuente del PDF de una recepción (EC-856).
 *
 * El detalle se lee FRESCO con el servicio (`getReceiptDetail`), sin pasar por
 * la caché del diálogo: un fallo aquí no debe cambiar el diálogo a su estado de
 * error ni dispararle su aviso; el error lo da solo "Descargar PDF" (regla de
 * `renderedDocumentPdfSource`). Módulo sin React para probarlo en `tests/unit/`.
 */
export const receiptPdfSource = (options: ReceiptPdfSourceOptions): DocumentPdfSource =>
  renderedDocumentPdfSource({
    fetchDetail: () => getReceiptDetail(options.receiptId),
    describe: receiptPdfDescriptor,
    render: (detail, { company }) => options.render(detail, company),
  });
