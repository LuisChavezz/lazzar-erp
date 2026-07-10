import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getStockReport } from "../services/actions";
import type {
  StockReportParams,
  StockReportResponse,
} from "../interfaces/stock-report.interface";

/**
 * Hook del reporte de existencias por periodo (paginado en servidor).
 *
 * `params` es `null` mientras el gate (almacén + rango de fechas) no está
 * completo; en ese caso `enabled: false` evita cualquier consulta.
 *
 * `page` viaja dentro de `params`, así que el `queryKey` incluye la página:
 * cada página se cachea de forma independiente y navegar hacia atrás/adelante
 * entre páginas ya traídas no vuelve a consultar. `keepPreviousData` mantiene
 * visible la página anterior mientras llega la nueva, evitando el parpadeo a
 * pantalla de carga (misma convención que `useStockItems`).
 */
export const useStockReport = (params: StockReportParams | null) => {
  return useQuery<StockReportResponse>({
    queryKey: ["stock-report", params],
    queryFn: () => getStockReport(params as StockReportParams),
    enabled: params !== null,
    placeholderData: keepPreviousData,
  });
};
