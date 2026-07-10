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
import { getFullStockReport } from "./actions";
import { generateStockReportPdfBlob } from "./pdf/stockReportPdfBlob";

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
