/**
 * Catálogos cerrados de `existencias/por-almacen/` (nucleo-erp EC-774), en el
 * orden de los menús. Única fuente: los tipos (`StockEstado`,
 * `StockExistenciasRango`) y los codecs de la tabla salen de aquí.
 */

/** Valores de `?existencias=` (rangos de piezas). */
export const STOCK_EXISTENCIAS_RANGOS = ["cero", "1-10", "11-100", "mas-100"] as const;

/** Valores de `?estado=` y de `row.estado`. */
export const STOCK_ESTADOS = ["full", "ok", "low", "critical"] as const;
