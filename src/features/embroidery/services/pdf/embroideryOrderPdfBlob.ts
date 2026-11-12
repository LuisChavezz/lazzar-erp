/**
 * Genera el Blob PDF de una orden de bordado (EC-857), con el documento y
 * `@react-pdf/renderer` en carga diferida (`renderPdfBlob`, EC-695). `company`
 * es la empresa activa.
 */
import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderPdfBlob } from "@/src/utils/renderPdfBlob";
import type { EmbroideryOrderDetail } from "../../interfaces/embroidery.interface";

export const generateEmbroideryOrderPdfBlob = (
  order: EmbroideryOrderDetail,
  company: PdfCompany | null,
): Promise<Blob> =>
  renderPdfBlob(
    () => import("@/src/pdfs/EmbroideryOrderPdfDocument").then((m) => m.EmbroideryOrderPdfDocument),
    { order, company },
  );
