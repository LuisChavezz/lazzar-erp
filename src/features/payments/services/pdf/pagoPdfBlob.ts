/**
 * Genera el Blob PDF de un pago a proveedor (EC-859), con el documento y
 * `@react-pdf/renderer` en carga diferida (`renderPdfBlob`). `company` es la
 * empresa activa.
 */
import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderPdfBlob } from "@/src/utils/renderPdfBlob";
import type { Pago } from "../../interfaces/payment.interface";

export const generatePagoPdfBlob = (pago: Pago, company: PdfCompany | null): Promise<Blob> =>
  renderPdfBlob(() => import("@/src/pdfs/PagoPdfDocument").then((m) => m.PagoPdfDocument), { pago, company });
