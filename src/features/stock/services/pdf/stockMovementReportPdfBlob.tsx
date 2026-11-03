/**
 * Genera un Blob PDF a partir del reporte de movimientos COMPLETO (todas las
 * filas del periodo, no solo la página visible). El documento (y con él
 * `@react-pdf/renderer`) se carga con `import()` dinámico vía
 * `renderPdfBlob`, para que la librería no entre en el chunk inicial de
 * Reportes (EC-700).
 */
import type { StockMovementReportResponse } from "../../interfaces/stock-movement-report.interface";
import { renderPdfBlob } from "@/src/utils/renderPdfBlob";

export const generateStockMovementReportPdfBlob = async (
  report: StockMovementReportResponse,
): Promise<Blob> =>
  renderPdfBlob(
    () =>
      import("@/src/pdfs/StockMovementReportPdfDocument").then(
        (m) => m.StockMovementReportPdfDocument,
      ),
    { report },
  );
