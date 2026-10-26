import type { Query, QueryClient, QueryKey } from "@tanstack/react-query";
import { INVENTORY_PIPELINE_QUERY_KEY } from "@/src/features/inventory-pipeline/hooks/useInventoryPipeline";
import { ORDER_STOCK_DETAIL_QUERY_KEY } from "@/src/features/orders/hooks/useOrderStockDetail";
import { STOCK_MOVEMENTS_QUERY_KEY } from "@/src/features/stock-movements/hooks/useStockMovements";
import { STOCK_ITEMS_QUERY_KEY } from "../hooks/useStockItems";
import { STOCK_MOVEMENT_REPORT_QUERY_KEY } from "../hooks/useStockMovementReport";
import { STOCK_REPORT_QUERY_KEY } from "../hooks/useStockReport";

/**
 * Prefijos de las consultas que leen existencias o movimientos de inventario.
 * Salen de la definición de cada llave (cada una lleva sus filtros detrás), así
 * que se invalidan por prefijo y no pueden separarse de ella:
 *
 * - existencias por almacén y su chequeo (`useStockItems`, `useStockMovementForm`);
 * - reportes de existencias y de movimientos;
 * - historial de movimientos (`useStockMovements`);
 * - pipeline de existencias, producción y compras;
 * - "Revisar inventario" de cada pedido (`useOrderStockDetail`).
 */
const STOCK_QUERY_PREFIXES: readonly QueryKey[] = [
  STOCK_ITEMS_QUERY_KEY,
  STOCK_REPORT_QUERY_KEY,
  STOCK_MOVEMENT_REPORT_QUERY_KEY,
  STOCK_MOVEMENTS_QUERY_KEY,
  INVENTORY_PIPELINE_QUERY_KEY,
  ORDER_STOCK_DETAIL_QUERY_KEY,
];

/**
 * Invalida toda vista de existencias tras una operación que movió inventario
 * (picking, traspaso, movimiento manual, cancelación de pedido). Las montadas
 * se releen al momento; las demás, al volver a montarse.
 *
 * `exclude` deja fuera consultas concretas que NO deben releerse (p. ej. las
 * de un pedido recién cancelado, que darían 404). Devuelve la promesa de todas
 * por si el llamador quiere esperarlas; no rechaza (TanStack no lanza al
 * releer).
 */
export const invalidateStockQueries = (
  queryClient: QueryClient,
  { exclude }: { exclude?: (query: Query) => boolean } = {},
): Promise<void> =>
  Promise.all(
    STOCK_QUERY_PREFIXES.map((queryKey) =>
      queryClient.invalidateQueries({
        queryKey,
        predicate: exclude ? (query) => !exclude(query) : undefined,
      }),
    ),
  ).then(() => undefined);
