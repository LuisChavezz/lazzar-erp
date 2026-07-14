/**
 * Exportación a PDF del reporte de inventario, generado en el cliente con
 * react-pdf y descargado directamente (sin API route ni funciones de servidor),
 * mirando el patrón de "Descargar PDF" de cotizaciones / órdenes de compra.
 *
 * Exporta SIEMPRE el conjunto filtrado completo (todas las páginas del
 * periodo), no la página visible: por eso recibe el contexto de filtros y
 * resuelve el reporte completo con `getFullStockReport`.
 */
import type { StockReportParams } from "../interfaces/stock-report.interface";
import type { StockMovementReportParams } from "../interfaces/stock-movement-report.interface";
import { getFullStockReport, getFullStockMovementReport } from "./actions";
import { generateStockReportPdfBlob } from "./pdf/stockReportPdfBlob";
import { generateStockMovementReportPdfBlob } from "./pdf/stockMovementReportPdfBlob";

export const exportStockReportPdf = async (
  params: Omit<StockReportParams, "page" | "page_size">,
): Promise<void> => {
  const fullReport = await getFullStockReport(params);
  const blob = await generateStockReportPdfBlob(fullReport);

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `reporte-inventario-${params.almacen_id}-${params.fecha_inicio}-${params.fecha_final}.pdf`;
  link.click();
  URL.revokeObjectURL(objectUrl);
};

/**
 * Exportación a PDF del reporte de movimientos, mismo patrón que
 * `exportStockReportPdf`: resuelve el conjunto filtrado COMPLETO (todas las
 * filas del periodo, no la página visible) con `getFullStockMovementReport` y
 * dispara la descarga en el cliente. El almacén es opcional; cuando no se filtra
 * por almacén se usa "todos" en el nombre del archivo.
 */
export const exportStockMovementReportPdf = async (
  params: Omit<StockMovementReportParams, "page" | "page_size">,
): Promise<void> => {
  const fullReport = await getFullStockMovementReport(params);
  const blob = await generateStockMovementReportPdfBlob(fullReport);

  const almacenPart = params.almacen_id ?? "todos";
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `reporte-movimientos-${params.tipo_movimiento}-${almacenPart}-${params.fecha_inicio}-${params.fecha_final}.pdf`;
  link.click();
  URL.revokeObjectURL(objectUrl);
};
