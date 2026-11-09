"use client";

import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useMutationLock } from "@/src/hooks/useMutationLock";
import { downloadBlob } from "@/src/utils/downloadBlob";
import type { StockMovementReportExportParams } from "../interfaces/stock-movement-report.interface";
import { exportStockMovementReport } from "../services/actions";
import {
  STOCK_REPORT_EXPORT_FORMAT_LABEL,
  type StockReportExportFormat,
  stockMovementReportFileName,
  stockReportExportErrorMessage,
} from "../utils/stockReportExport";

/** Candado de la descarga, ÚNICO por formato: el PDF no bloquea al Excel. */
export const exportStockMovementReportMutationKey = (formato: StockReportExportFormat) =>
  ["export-stock-movement-report", formato] as const;

interface ExportStockMovementReportVariables {
  params: StockMovementReportExportParams;
  /** Código del almacén filtrado para el nombre del archivo; sin almacén no se usa. */
  codigo: string | null | undefined;
}

/**
 * Descarga el reporte de movimientos COMPLETO en `formato`, generado por el
 * backend (EC-819). Mismo patrón que `useExportStockReport`: candado por
 * formato con `useMutationLock` y nombre de archivo armado en el front.
 */
export const useExportStockMovementReport = (formato: StockReportExportFormat) => {
  const mutationKey = exportStockMovementReportMutationKey(formato);
  const { isRunning, isIdle } = useMutationLock(mutationKey);

  const mutation = useMutation<void, unknown, ExportStockMovementReportVariables>({
    mutationKey,
    mutationFn: async ({ params, codigo }) => {
      const blob = await exportStockMovementReport(params, formato);
      downloadBlob(
        blob,
        stockMovementReportFileName({
          tipoMovimiento: params.tipo_movimiento,
          almacenId: params.almacen_id,
          codigo,
          fechaInicio: params.fecha_inicio,
          fechaFinal: params.fecha_final,
          formato,
        }),
      );
    },
    onSuccess: () => {
      toast.success(`${STOCK_REPORT_EXPORT_FORMAT_LABEL[formato]} descargado correctamente`);
    },
    onError: (error) => {
      toast.error(stockReportExportErrorMessage(error, formato));
    },
  });

  const exportReport = (variables: ExportStockMovementReportVariables) => {
    if (!isIdle()) return;
    mutation.mutate(variables);
  };

  return { exportReport, isExporting: isRunning };
};
