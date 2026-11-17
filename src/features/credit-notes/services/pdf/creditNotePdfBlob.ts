/**
 * Genera el Blob PDF de una nota de crédito (EC-859), con el documento y
 * `@react-pdf/renderer` en carga diferida (`renderPdfBlob`). `company` es la
 * empresa activa.
 */
import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderPdfBlob } from "@/src/utils/renderPdfBlob";
import type { NotaCredito } from "../../interfaces/credit-note.interface";

export const generateCreditNotePdfBlob = (nota: NotaCredito, company: PdfCompany | null): Promise<Blob> =>
  renderPdfBlob(
    () => import("@/src/pdfs/CreditNotePdfDocument").then((m) => m.CreditNotePdfDocument),
    { nota, company },
  );
