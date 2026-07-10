/**
 * Genera un Blob PDF a partir del reporte de inventario COMPLETO (todas las
 * filas del periodo, no solo la página visible). Usa dynamic import de
 * @react-pdf/renderer para evitar problemas en SSR, igual que los demás PDF.
 */
import React from "react";
import type { StockReportResponse } from "../../interfaces/stock-report.interface";
import { StockReportPdfDocument } from "@/src/pdfs/StockReportPdfDocument";

export const generateStockReportPdfBlob = async (
  report: StockReportResponse,
): Promise<Blob> => {
  const { pdf } = await import("@react-pdf/renderer");

  return pdf(<StockReportPdfDocument report={report} />).toBlob();
};
