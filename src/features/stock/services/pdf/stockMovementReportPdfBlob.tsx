/**
 * Genera un Blob PDF a partir del reporte de movimientos COMPLETO (todas las
 * filas del periodo, no solo la página visible). Usa dynamic import de
 * @react-pdf/renderer para evitar problemas en SSR, igual que los demás PDF.
 */
import React from "react";
import type { StockMovementReportResponse } from "../../interfaces/stock-movement-report.interface";
import { StockMovementReportPdfDocument } from "@/src/pdfs/StockMovementReportPdfDocument";

export const generateStockMovementReportPdfBlob = async (
  report: StockMovementReportResponse,
): Promise<Blob> => {
  const { pdf } = await import("@react-pdf/renderer");

  return pdf(<StockMovementReportPdfDocument report={report} />).toBlob();
};
