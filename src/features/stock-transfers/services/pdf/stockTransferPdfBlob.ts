/**
 * Genera el Blob PDF de un traspaso (EC-858), con el documento y
 * `@react-pdf/renderer` en carga diferida (`renderPdfBlob`, EC-695). `company`
 * es la empresa activa.
 */
import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderPdfBlob } from "@/src/utils/renderPdfBlob";
import type { TransferenciaDetail } from "../../interfaces/stock-transfer.interface";

export const generateStockTransferPdfBlob = (
  transfer: TransferenciaDetail,
  company: PdfCompany | null,
): Promise<Blob> =>
  renderPdfBlob(
    () => import("@/src/pdfs/StockTransferPdfDocument").then((m) => m.StockTransferPdfDocument),
    { transfer, company },
  );
