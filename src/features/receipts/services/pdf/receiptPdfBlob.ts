/**
 * Genera el Blob PDF de una recepción (EC-856).
 *
 * El documento (y con él `@react-pdf/renderer`) se carga con `import()`
 * dinámico vía `renderPdfBlob`, como los de la OC y el pedido: la librería solo
 * se descarga al generar el PDF (EC-695). `company` es la empresa activa.
 */
import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderPdfBlob } from "@/src/utils/renderPdfBlob";
import type { ReceiptDetail } from "../../interfaces/receipt.interface";

export const generateReceiptPdfBlob = (
  receipt: ReceiptDetail,
  company: PdfCompany | null,
): Promise<Blob> =>
  renderPdfBlob(
    () => import("@/src/pdfs/ReceiptPdfDocument").then((m) => m.ReceiptPdfDocument),
    { receipt, company },
  );
