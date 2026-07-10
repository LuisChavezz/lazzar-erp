"use client";

import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import type { StockReportParams } from "../interfaces/stock-report.interface";
import { exportStockReportPdf } from "../services/pdf.actions";

export const exportStockReportPdfMutationKey = ["export-stock-report-pdf"] as const;

/**
 * Exporta el reporte de inventario COMPLETO (todas las páginas del periodo) a
 * PDF y dispara la descarga. `isPending` expone el estado de exportación para
 * que la UI muestre "Generando PDF..." — puede tardar unos segundos con miles
 * de filas. Mismo patrón que `useDownloadPurchaseOrderPdf`.
 */
export const useExportStockReportPdf = () => {
  return useMutation({
    mutationKey: exportStockReportPdfMutationKey,
    mutationFn: (params: Omit<StockReportParams, "page" | "page_size">) =>
      exportStockReportPdf(params),
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
