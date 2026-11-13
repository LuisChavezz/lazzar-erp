/**
 * Genera el Blob PDF de un surtido (EC-858), con el documento y
 * `@react-pdf/renderer` en carga diferida (`renderPdfBlob`, EC-695). `company`
 * es la empresa activa.
 */
import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderPdfBlob } from "@/src/utils/renderPdfBlob";
import type { Picking } from "../../interfaces/picking.interface";

export const generatePickingPdfBlob = (picking: Picking, company: PdfCompany | null): Promise<Blob> =>
  renderPdfBlob(() => import("@/src/pdfs/PickingPdfDocument").then((m) => m.PickingPdfDocument), {
    picking,
    company,
  });
