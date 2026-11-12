/**
 * Genera el Blob PDF de una orden de corte de manga (EC-857), con el documento
 * y `@react-pdf/renderer` en carga diferida (`renderPdfBlob`, EC-695).
 * `company` es la empresa activa.
 */
import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderPdfBlob } from "@/src/utils/renderPdfBlob";
import type { CorteMangaOrder } from "../../interfaces/corte-manga-order.interface";

export const generateCorteMangaOrderPdfBlob = (
  order: CorteMangaOrder,
  company: PdfCompany | null,
): Promise<Blob> =>
  renderPdfBlob(
    () => import("@/src/pdfs/CorteMangaOrderPdfDocument").then((m) => m.CorteMangaOrderPdfDocument),
    { order, company },
  );
