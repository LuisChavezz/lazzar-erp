/**
 * Genera el Blob PDF de un cobro (EC-859), con el documento y
 * `@react-pdf/renderer` en carga diferida (`renderPdfBlob`). `company` es la
 * empresa activa.
 */
import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderPdfBlob } from "@/src/utils/renderPdfBlob";
import type { Cobro } from "../../interfaces/collection.interface";

export const generateCobroPdfBlob = (cobro: Cobro, company: PdfCompany | null): Promise<Blob> =>
  renderPdfBlob(() => import("@/src/pdfs/CobroPdfDocument").then((m) => m.CobroPdfDocument), { cobro, company });
