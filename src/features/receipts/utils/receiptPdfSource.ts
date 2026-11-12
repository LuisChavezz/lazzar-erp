import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderedDocumentPdfSource, type DocumentPdfSource } from "@/src/pdfs/shared/documentPdfSource";
import type { ReceiptDetail } from "../interfaces/receipt.interface";
import { getReceiptDetail } from "../services/actions";
import { receiptPdfDescriptor } from "./receiptPdf";

/**
 * Fuente del PDF de una recepción (EC-856).
 *
 * El detalle se lee FRESCO con el servicio (`getReceiptDetail`), sin pasar por
 * la caché `["receipt-detail", id]` que observa el diálogo: un fallo aquí no
 * debe cambiar el diálogo a su estado de error; el aviso lo da solo
 * "Descargar PDF" (regla de `renderedDocumentPdfSource`). Módulo sin React para
 * probarlo en `tests/unit/`; `render` se inyecta (el botón pasa
 * `generateReceiptPdfBlob`).
 */
export const receiptPdfSource = (
  receiptId: number,
  render: (detail: ReceiptDetail, company: PdfCompany) => Promise<Blob>,
): DocumentPdfSource =>
  renderedDocumentPdfSource({
    fetchDetail: () => getReceiptDetail(receiptId),
    describe: receiptPdfDescriptor,
    render: (detail, { company }) => render(detail, company),
  });
