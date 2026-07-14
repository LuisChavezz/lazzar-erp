"use client";

import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import type { StockMovementReportParams } from "../interfaces/stock-movement-report.interface";
import { exportStockMovementReportPdf } from "../services/pdf.actions";

export const exportStockMovementReportPdfMutationKey = [
  "export-stock-movement-report-pdf",
] as const;

/**
 * Exporta el reporte de movimientos COMPLETO (todas las filas del periodo) a
 * PDF y dispara la descarga. `isPending` expone el estado de exportación para
 * que la UI muestre "Generando PDF...". Mismo patrón que
 * `useExportStockReportPdf`.
 */
export const useExportStockMovementReportPdf = () => {
  return useMutation({
    mutationKey: exportStockMovementReportPdfMutationKey,
    mutationFn: (params: Omit<StockMovementReportParams, "page" | "page_size">) =>
      exportStockMovementReportPdf(params),
    onSuccess: () => {
      toast.success("PDF generado y descargado correctamente");
    },
    onError: (error) => {
      toast.error(
        extractErrorMessage(error, "No se pudo generar el PDF del reporte"),
      );
    },
  });
};
