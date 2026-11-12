/**
 * Genera el Blob PDF de una orden de reflejante (EC-857), con el documento y
 * `@react-pdf/renderer` en carga diferida (`renderPdfBlob`, EC-695). `company`
 * es la empresa activa.
 */
import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderPdfBlob } from "@/src/utils/renderPdfBlob";
import type { ReflectiveOrderDetail } from "../../interfaces/reflective-order.interface";

export const generateReflectiveOrderPdfBlob = (
  order: ReflectiveOrderDetail,
  company: PdfCompany | null,
): Promise<Blob> =>
  renderPdfBlob(
    () => import("@/src/pdfs/ReflectiveOrderPdfDocument").then((m) => m.ReflectiveOrderPdfDocument),
    { order, company },
  );
