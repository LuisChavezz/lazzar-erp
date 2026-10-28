"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import {
  CEDICOR_PRODUCTION_ORDER_HEADER_FILTERS,
  getCedicorProductionOrderColumns,
} from "./CedicorProductionOrderColumns";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { MOCK_CEDICOR_PRODUCTION_ORDERS } from "../mocks/cedicor-production-order.mock";
import {
  PRODUCTION_ORDER_STEPS,
  PRODUCTION_ORDER_STATUS_LABELS,
  type ProductionOrderStatus,
} from "../interfaces/cedicor-production-order.interface";

// Tipo ampliado para el valor del filtro de pestañas
type ProductionOrderFilterValue = ProductionOrderStatus | 'todas';

// Pestañas de filtro — "Todas", cada paso del flujo, material_faltante y cancelados
const FILTROS: { value: ProductionOrderFilterValue; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  ...PRODUCTION_ORDER_STEPS.map((s, i) => ({
    value: s as ProductionOrderStatus,
    label: `${i + 1}. ${PRODUCTION_ORDER_STATUS_LABELS[s]}`,
  })),
  { value: 'material_faltante', label: 'Material Faltante' },
  { value: 'cancelado',         label: 'Cancelados' },
];

/** Lista principal de órdenes de producción (resurtido / stock) */
export function CedicorProductionOrderList() {
  const [filtroEstatus, setFiltroEstatus] = useState<ProductionOrderFilterValue>('todas');

  const columns = useMemo(() => getCedicorProductionOrderColumns(), []);

  const ordenesFiltradas = useMemo(() => {
    if (filtroEstatus === 'todas') return MOCK_CEDICOR_PRODUCTION_ORDERS;
    return MOCK_CEDICOR_PRODUCTION_ORDERS.filter((o) => o.estatus === filtroEstatus);
  }, [filtroEstatus]);

  return (
    <div className="space-y-4">

      {/* ── Filtros de estatus / paso del flujo ──────────────────────── */}
      <div
        className="flex items-center gap-1.5 flex-wrap"
        role="group"
        aria-label="Filtrar por estatus del flujo de producción"
      >
        {FILTROS.map((f) => {
          const count =
            f.value === 'todas'
              ? MOCK_CEDICOR_PRODUCTION_ORDERS.length
              : MOCK_CEDICOR_PRODUCTION_ORDERS.filter((o) => o.estatus === f.value).length;
          const isActive = filtroEstatus === f.value;

          if (count === 0 && f.value !== 'todas') return null;

          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFiltroEstatus(f.value)}
              aria-pressed={isActive}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              {f.label}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Tabla principal ───────────────────────────────────────────── */}
      <DataTable
        columns={withHeaderFilters(
          columns,
          MOCK_CEDICOR_PRODUCTION_ORDERS,
          CEDICOR_PRODUCTION_ORDER_HEADER_FILTERS,
        )}
        data={ordenesFiltradas}
        baseDataCount={MOCK_CEDICOR_PRODUCTION_ORDERS.length}
        searchPlaceholder="Buscar folio, cliente, producto…"
      />
    </div>
  );
}
