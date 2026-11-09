"use client";

import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useMutationLock } from "@/src/hooks/useMutationLock";
import { downloadBlob } from "@/src/utils/downloadBlob";
import type { StockReportExportParams } from "../interfaces/stock-report.interface";
import { exportStockReport } from "../services/actions";
import {
  STOCK_REPORT_EXPORT_FORMAT_LABEL,
  type StockReportExportFormat,
  stockReportExportErrorMessage,
  stockReportFileName,
} from "../utils/stockReportExport";

/** Candado de la descarga, ÚNICO por formato: el PDF no bloquea al Excel. */
export const exportStockReportMutationKey = (formato: StockReportExportFormat) =>
  ["export-stock-report", formato] as const;

interface ExportStockReportVariables {
  params: StockReportExportParams;
  /** Código del almacén para el nombre del archivo (`useWarehouses`). */
  codigo: string | null | undefined;
}

/**
 * Descarga el reporte de existencias COMPLETO (todas las filas del periodo) en
 * `formato`, generado por el backend (EC-819). La mutación con `mutationKey`
 * por formato es el candado contra el doble clic: `isIdle()` se consulta de
 * forma síncrona, así que un segundo clic antes del siguiente render no lanza
 * otra petición. Mismo patrón que `useDownloadCobroRep`.
 */
export const useExportStockReport = (formato: StockReportExportFormat) => {
  const mutationKey = exportStockReportMutationKey(formato);
  const { isRunning, isIdle } = useMutationLock(mutationKey);

  const mutation = useMutation<void, unknown, ExportStockReportVariables>({
    mutationKey,
    mutationFn: async ({ params, codigo }) => {
      const blob = await exportStockReport(params, formato);
      downloadBlob(
        blob,
        stockReportFileName({
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

  const exportReport = (variables: ExportStockReportVariables) => {
    if (!isIdle()) return;
    mutation.mutate(variables);
  };

  return { exportReport, isExporting: isRunning };
};
