/**
 * Genera un Blob PDF a partir del reporte de inventario COMPLETO (todas las
 * filas del periodo, no solo la página visible). El documento (y con él
 * `@react-pdf/renderer`) se carga con `import()` dinámico vía
 * `renderPdfBlob`, para que la librería no entre en el chunk inicial de
 * Reportes (EC-700).
 */
import type { StockReportResponse } from "../../interfaces/stock-report.interface";
import { renderPdfBlob } from "@/src/utils/renderPdfBlob";

export const generateStockReportPdfBlob = (
  report: StockReportResponse,
): Promise<Blob> =>
  renderPdfBlob(
    () => import("@/src/pdfs/StockReportPdfDocument").then((m) => m.StockReportPdfDocument),
    { report },
  );
