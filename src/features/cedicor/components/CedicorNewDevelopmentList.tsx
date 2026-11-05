"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import {
  CEDICOR_NEW_DEVELOPMENT_HEADER_FILTERS,
  getCedicorNewDevelopmentColumns,
} from "./CedicorNewDevelopmentColumns";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import {
  FLOW_STEPS,
  FLOW_STATUS_LABELS,
  type FlowStatus,
  type NewDevelopment,
} from "../interfaces/cedicor-new-development.interface";

// Tipo ampliado para el valor del filtro
type FiltroEstatus = FlowStatus | 'todas';

// Pestañas de filtro — "Todas", cada paso del flujo, material_faltante y cancelados
const FILTROS: { value: FiltroEstatus; label: string }[] = [
  { value: 'todas',             label: 'Todas' },
  ...FLOW_STEPS.map((s, i) => ({
    value: s as FlowStatus,
    label: `${i + 1}. ${FLOW_STATUS_LABELS[s]}`,
  })),
  { value: 'material_faltante', label: 'Material Faltante' },
  { value: 'cancelado',         label: 'Cancelados' },
];

interface CedicorNewDevelopmentListProps {
  data: NewDevelopment[];
}

/** Lista principal de órdenes de Nuevo Desarrollo de Producto */
export function CedicorNewDevelopmentList({ data }: CedicorNewDevelopmentListProps) {
  const [filtroEstatus, setFiltroEstatus] = useState<FiltroEstatus>('todas');

  const columns = useMemo(() => getCedicorNewDevelopmentColumns(), []);

  const ordenesFiltradas = useMemo(() => {
    if (filtroEstatus === 'todas') return data;
    return data.filter((o) => o.estatus === filtroEstatus);
  }, [data, filtroEstatus]);

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
              ? data.length
              : data.filter((o) => o.estatus === f.value).length;
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
          data,
          CEDICOR_NEW_DEVELOPMENT_HEADER_FILTERS,
        )}
        data={ordenesFiltradas}
        baseDataCount={data.length}
        searchPlaceholder="Buscar folio, cliente, producto…"
      />
    </div>
  );
}


