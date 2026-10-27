import { buildDistinctFilterOptions, buildMonthFilterOptions } from "@/src/utils/columnFilterOptions";
import type { StockItem } from "../interfaces/stock.interface";

/**
 * Opciones de los filtros de encabezado de la tabla de existencias que salen
 * de los datos (la lista del almacén elegido está completa en memoria). Estado
 * y Existencias usan opciones fijas (ver `StockColumns.tsx`). El filtro de
 * almacén vive aparte, en `WarehouseFilter` (`?almacen=<id>`).
 */
export interface StockFilterOptions {
  productos: { value: string; label: string }[];
  tipos: { value: string; label: string }[];
  colores: { value: string; label: string }[];
  ubicaciones: { value: string; label: string }[];
  meses: { value: string; label: string }[];
}

export function buildStockFilterOptions(items: StockItem[]): StockFilterOptions {
  return {
    productos: buildDistinctFilterOptions(items, (item) => item.producto_info.nombre),
    tipos: buildDistinctFilterOptions(items, (item) => item.producto_info.tipo),
    colores: buildDistinctFilterOptions(items, (item) => item.producto_info.color),
    ubicaciones: buildDistinctFilterOptions(items, (item) => item.ubicacion_info?.nombre_completo),
    meses: buildMonthFilterOptions(items.map((item) => item.fecha_actualizacion)),
  };
}
