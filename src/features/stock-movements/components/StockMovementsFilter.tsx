import type { DataTableFilterConfig } from "@/src/components/DataTable";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type MovementTypeFilter = "ENTRADA" | "SALIDA" | "AJUSTE";

export interface StockMovementsFilters {
  /** `null` significa "Todos" (sin filtro). */
  tipo_movimiento: MovementTypeFilter | null;
}

// ─── Configuración de filtros para DataTable ────────────────────────────────

export const stockMovementsFilterConfig: DataTableFilterConfig[] = [
  {
    id: "tipo_movimiento",
    label: "Tipo de Movimiento",
    options: [
      { value: "ENTRADA", label: "Entrada" },
      { value: "SALIDA", label: "Salida" },
      { value: "AJUSTE", label: "Ajuste" },
    ],
  },
];
