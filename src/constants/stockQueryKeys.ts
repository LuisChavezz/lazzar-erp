/**
 * Prefijos de las llaves de TanStack Query que leen existencias o movimientos
 * de inventario. Viven aquí, fuera de los módulos, porque los usan a la vez las
 * consultas de varios módulos (stock, movimientos, pipeline, pedidos) y
 * `invalidateStockQueries` (`features/stock`): así ningún módulo importa de
 * otro solo por una llave. Cada consulta arma su llave con su prefijo y sus
 * filtros detrás, y se invalidan por prefijo.
 */

/** Existencias por almacén (`useStockItems`) y su chequeo (`useStockMovementForm`). */
export const STOCK_ITEMS_QUERY_KEY = ["stock-items"] as const;

/** Reporte de existencias (`useStockReport`). */
export const STOCK_REPORT_QUERY_KEY = ["stock-report"] as const;

/** Reporte de movimientos (`useStockMovementReport`). */
export const STOCK_MOVEMENT_REPORT_QUERY_KEY = ["stock-movement-report"] as const;

/** Historial de movimientos (`useStockMovements`). */
export const STOCK_MOVEMENTS_QUERY_KEY = ["stockMovements"] as const;

/** Detalle de un movimiento (`useStockMovementDetail`). */
export const STOCK_MOVEMENT_DETAIL_QUERY_KEY = ["stock-movement-detail"] as const;

/** Pipeline de existencias, producción y compras (`useInventoryPipeline`). */
export const INVENTORY_PIPELINE_QUERY_KEY = ["inventory-pipeline"] as const;

/** "Revisar inventario" de un pedido (`useOrderStockDetail`). */
export const ORDER_STOCK_DETAIL_QUERY_KEY = ["order-stock-detail"] as const;
