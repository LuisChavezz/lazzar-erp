"use client";

import { useMutation, type MutationObserverOptions } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useMutationLock } from "@/src/hooks/useMutationLock";
import { downloadBlob } from "@/src/utils/downloadBlob";
import {
  STOCK_REPORT_EXPORT_FORMAT_LABEL,
  type ReportFile,
  type StockReportExportFormat,
  fileNameFromContentDisposition,
  stockReportExportErrorMessage,
} from "../utils/stockReportExport";

/**
 * Candado de UNA descarga: reporte, formato y filtros. Con los filtros en la
 * llave, cambiar de almacén o de fechas mientras se genera un archivo deja los
 * botones libres para los filtros nuevos (la descarga anterior sigue y termina
 * sola), y un doble clic sobre los MISMOS filtros sigue sin lanzar otra
 * petición. TanStack compara la llave por valor y sin importar el orden de las
 * propiedades, y un `undefined` (sin almacén) cuenta como ausente.
 */
export const reportExportMutationKey = (
  report: string,
  formato: StockReportExportFormat,
  params: object | null,
) => ["export-report", report, formato, params] as const;

interface ReportExportVariables<P> {
  params: P;
  /** Nombre si el navegador no puede leer el `Content-Disposition` (EC-824). */
  fallbackFileName: string;
}

/**
 * Opciones de la mutación de UNA descarga (separadas del hook para probarlas
 * con un `QueryClient` real). El aviso de éxito nombra el archivo descargado:
 * ese nombre lleva el almacén y el periodo, así que nunca da a entender que el
 * archivo corresponde a otros filtros que los que se pidieron, aunque el
 * usuario ya los haya cambiado cuando termina.
 */
export const reportExportMutationOptions = <P extends object>({
  report,
  formato,
  params,
  request,
  download = downloadBlob,
}: {
  report: string;
  formato: StockReportExportFormat;
  params: P | null;
  request: (params: P, formato: StockReportExportFormat) => Promise<ReportFile>;
  download?: (blob: Blob, fileName: string) => void;
}): MutationObserverOptions<string, unknown, ReportExportVariables<P>> => ({
  mutationKey: reportExportMutationKey(report, formato, params),
  mutationFn: async ({ params: requested, fallbackFileName }) => {
    const file = await request(requested, formato);
    const fileName = fileNameFromContentDisposition(file.contentDisposition) ?? fallbackFileName;
    download(file.blob, fileName);
    return fileName;
  },
  onSuccess: (fileName) => {
    toast.success(`${STOCK_REPORT_EXPORT_FORMAT_LABEL[formato]} descargado: ${fileName}`);
  },
  onError: (error) => {
    toast.error(stockReportExportErrorMessage(error, formato));
  },
});

export interface ReportExportConfig<P extends object> {
  /** Nombre del reporte en la llave del candado. */
  report: string;
  request: (params: P, formato: StockReportExportFormat) => Promise<ReportFile>;
  /** Nombre de respaldo para estos filtros y formato. */
  fallbackFileName: (params: P, formato: StockReportExportFormat) => string;
}

const useFormatExport = <P extends object>(
  config: ReportExportConfig<P>,
  formato: StockReportExportFormat,
  params: P | null,
) => {
  const options = reportExportMutationOptions({
    report: config.report,
    formato,
    params,
    request: config.request,
  });
  const { isRunning, isIdle } = useMutationLock(reportExportMutationKey(config.report, formato, params));
  const mutation = useMutation(options);

  const start = () => {
    // `isIdle()` consulta la caché de mutaciones de forma SÍNCRONA: un segundo
    // clic antes del siguiente render ya ve la descarga en curso.
    if (params === null || !isIdle()) return;
    mutation.mutate({ params, fallbackFileName: config.fallbackFileName(params, formato) });
  };

  return { start, isRunning };
};

/**
 * Descarga en PDF o Excel de un reporte que genera el backend (EC-819). Recibe
 * los filtros ACTUALES de la vista (`null` mientras falte alguno obligatorio:
 * entonces no descarga nada) y devuelve `exportReport(formato)` e
 * `isExporting` por formato PARA ESOS FILTROS. Cada formato tiene su propio
 * candado (`useMutationLock`), así que el PDF no bloquea al Excel.
 */
export const useReportExport = <P extends object>(config: ReportExportConfig<P>, params: P | null) => {
  const pdf = useFormatExport(config, "pdf", params);
  const xlsx = useFormatExport(config, "xlsx", params);

  const exportReport = (formato: StockReportExportFormat) =>
    formato === "pdf" ? pdf.start() : xlsx.start();

  const isExporting: Record<StockReportExportFormat, boolean> = {
    pdf: pdf.isRunning,
    xlsx: xlsx.isRunning,
  };

  return { exportReport, isExporting };
};
