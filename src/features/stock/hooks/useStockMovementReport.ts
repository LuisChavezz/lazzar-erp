import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getStockMovementReport } from "../services/actions";
import type {
  StockMovementReportParams,
  StockMovementReportResponse,
} from "../interfaces/stock-movement-report.interface";

/**
 * Hook del reporte de movimientos por periodo (paginado en servidor). Espejo de
 * `useStockReport`.
 *
 * `params` es `null` mientras el gate (tipo de movimiento + rango de fechas) no
 * está completo; en ese caso `enabled: false` evita cualquier consulta. El
 * almacén es opcional, así que NO forma parte del gate.
 *
 * `page` viaja dentro de `params`, así que el `queryKey` incluye la página:
 * cada página se cachea de forma independiente y navegar entre páginas ya
 * traídas no vuelve a consultar. `keepPreviousData` mantiene visible la página
 * anterior mientras llega la nueva, evitando el parpadeo a pantalla de carga.
 */
export const useStockMovementReport = (
  params: StockMovementReportParams | null,
) => {
  return useQuery<StockMovementReportResponse>({
    queryKey: ["stock-movement-report", params],
    queryFn: () => getStockMovementReport(params as StockMovementReportParams),
    enabled: params !== null,
    placeholderData: keepPreviousData,
  });
};
