import { keepPreviousData } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getStockReport } from "../services/actions";
import type {
  StockReportParams,
  StockReportResponse,
} from "../interfaces/stock-report.interface";
import { STOCK_REPORT_QUERY_KEY } from "@/src/constants/stockQueryKeys";

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
 * pantalla de carga.
 *
 * Va por `useGuardedQuery`: `isInitialError` solo es cierto si ESTOS
 * parámetros nunca cargaron (un refetch fallido conserva los datos y avisa
 * con un toast); no se expone el `isError` crudo.
 */
export const useStockReport = (params: StockReportParams | null) => {
  return useGuardedQuery<StockReportResponse>(
    {
      queryKey: [...STOCK_REPORT_QUERY_KEY, params],
      queryFn: () => getStockReport(params as StockReportParams),
      enabled: params !== null,
      placeholderData: keepPreviousData,
    },
    { toastId: "stock-report-refetch-error" },
  );
};
