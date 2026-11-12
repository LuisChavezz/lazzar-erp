/**
 * Genera el Blob PDF de una orden de producción (EC-857).
 *
 * El documento (y con él `@react-pdf/renderer`) se carga con `import()`
 * dinámico vía `renderPdfBlob`, como los de la OC, el pedido y la recepción:
 * la librería solo se descarga al generar el PDF (EC-695). `company` es la
 * empresa activa.
 */
import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderPdfBlob } from "@/src/utils/renderPdfBlob";
import type { ProductionOrderOnboarding } from "../../interfaces/production-order.interface";

export const generateProductionOrderPdfBlob = (
  op: ProductionOrderOnboarding,
  company: PdfCompany | null,
): Promise<Blob> =>
  renderPdfBlob(
    () => import("@/src/pdfs/ProductionOrderPdfDocument").then((m) => m.ProductionOrderPdfDocument),
    { op, company },
  );
