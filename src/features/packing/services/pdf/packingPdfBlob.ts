/**
 * Genera el Blob PDF de un embarque (EC-858), con el documento y
 * `@react-pdf/renderer` en carga diferida (`renderPdfBlob`, EC-695). `company`
 * es la empresa activa.
 */
import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderPdfBlob } from "@/src/utils/renderPdfBlob";
import type { Packing } from "../../interfaces/packing.interface";

export const generatePackingPdfBlob = (packing: Packing, company: PdfCompany | null): Promise<Blob> =>
  renderPdfBlob(() => import("@/src/pdfs/PackingPdfDocument").then((m) => m.PackingPdfDocument), {
    packing,
    company,
  });
