import { getStockStatus, type StockStatus } from "./StockColumns";
import type { DataTableFilterConfig } from "@/src/components/DataTable";
import type { StockItem } from "../interfaces/stock.interface";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Enriquece los items de stock con una propiedad `estado` computada
 * para que el sistema de filtros de DataTable pueda filtrar por nivel de stock.
 */
export function enrichStockWithStatus(
  items: StockItem[],
  maxStock: number,
): (StockItem & { estado: StockStatus })[] {
  return items.map((item) => ({
    ...item,
    estado: getStockStatus(item.stock, maxStock),
  }));
}

// ─── Factory de configuración de filtros ─────────────────────────────────────

/**
 * Configuración de filtros para la tabla de existencias.
 * El filtro de almacén vive exclusivamente en `WarehouseFilter` (selector
 * requerido vía `?almacen=<id>`), por lo que no se expone aquí.
 */
export const stockFilterConfig: DataTableFilterConfig[] = [
  {
    id: "estado",
    label: "Estado",
    options: [
      { value: "full", label: "Óptimo" },
      { value: "ok", label: "Normal" },
      { value: "low", label: "Bajo" },
      { value: "critical", label: "Crítico" },
    ],
  },
];
