/**
 * Genera el Blob PDF de una póliza (EC-859), con el documento y
 * `@react-pdf/renderer` en carga diferida (`renderPdfBlob`). `company` es la
 * empresa activa.
 */
import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderPdfBlob } from "@/src/utils/renderPdfBlob";
import type { Poliza } from "../../interfaces/poliza.interface";

export const generatePolizaPdfBlob = (poliza: Poliza, company: PdfCompany | null): Promise<Blob> =>
  renderPdfBlob(() => import("@/src/pdfs/PolizaPdfDocument").then((m) => m.PolizaPdfDocument), { poliza, company });
