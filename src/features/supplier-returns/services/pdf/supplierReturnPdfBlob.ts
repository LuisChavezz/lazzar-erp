/**
 * Genera el Blob PDF de una devolución a proveedor (EC-976). El documento (y
 * con él `@react-pdf/renderer`) se carga con `import()` dinámico vía
 * `renderPdfBlob`: la librería solo se descarga al generar el PDF (EC-695).
 */
import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderPdfBlob } from "@/src/utils/renderPdfBlob";
import type { SupplierReturn } from "../../interfaces/supplier-return.interface";

export const generateSupplierReturnPdfBlob = (
  supplierReturn: SupplierReturn,
  company: PdfCompany | null,
): Promise<Blob> =>
  renderPdfBlob(
    () => import("@/src/pdfs/SupplierReturnPdfDocument").then((m) => m.SupplierReturnPdfDocument),
    { supplierReturn, company },
  );
