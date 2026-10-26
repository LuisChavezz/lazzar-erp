import type { Query, QueryClient, QueryKey } from "@tanstack/react-query";
import {
  INVENTORY_PIPELINE_QUERY_KEY,
  ORDER_STOCK_DETAIL_QUERY_KEY,
  STOCK_ITEMS_QUERY_KEY,
  STOCK_MOVEMENT_DETAIL_QUERY_KEY,
  STOCK_MOVEMENT_REPORT_QUERY_KEY,
  STOCK_MOVEMENTS_QUERY_KEY,
  STOCK_REPORT_QUERY_KEY,
} from "@/src/constants/stockQueryKeys";

/**
 * Prefijos de las consultas que leen existencias o movimientos de inventario
 * (ver `src/constants/stockQueryKeys.ts`): cada consulta arma su llave con el
 * mismo prefijo, así que se invalidan por prefijo y no pueden separarse.
 */
const STOCK_QUERY_PREFIXES: readonly QueryKey[] = [
  STOCK_ITEMS_QUERY_KEY,
  STOCK_REPORT_QUERY_KEY,
  STOCK_MOVEMENT_REPORT_QUERY_KEY,
  STOCK_MOVEMENTS_QUERY_KEY,
  STOCK_MOVEMENT_DETAIL_QUERY_KEY,
  INVENTORY_PIPELINE_QUERY_KEY,
  ORDER_STOCK_DETAIL_QUERY_KEY,
];

/**
 * Invalida toda vista de existencias tras una operación que movió inventario
 * (picking, traspaso, movimiento manual, cancelación de pedido, inspección de
 * calidad, recálculo de consumos de una OP). Las montadas se releen al
 * momento; las demás, al volver a montarse.
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
