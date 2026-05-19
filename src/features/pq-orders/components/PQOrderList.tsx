"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { MOCK_PQ_ORDERS } from "../mocks/pq-order.mock";
import { getPQOrderColumns } from "./PQOrderColumns";
import {
  PQ_ORDER_STEPS,
  PQ_ORDER_STATUS_LABELS,
  type PQOrderStatus,
} from "../interfaces/pq-order.interface";

// ── Tipo del valor de filtro ──────────────────────────────────────────────────

type PQFilterValue = PQOrderStatus | 'todas';

// ── Definición de pestañas de filtro ─────────────────────────────────────────

const FILTROS: { value: PQFilterValue; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  // Pasos canónicos del flujo (7 pasos)
  ...PQ_ORDER_STEPS.map((s) => ({
    value: s as PQOrderStatus,
    label: PQ_ORDER_STATUS_LABELS[s],
  })),
  // Estados terminales
  { value: 'surtido',   label: 'Surtidos'   },
  { value: 'cancelado', label: 'Cancelados' },
];

// Clase de la pestaña activa
const FILTRO_ACTIVO_CLS = 'bg-sky-600 text-white dark:bg-sky-500 shadow-sm';

// ── Componente principal ──────────────────────────────────────────────────────

/** Lista de Pedidos PQ con filtros por estatus del flujo de surtido */
export function PQOrderList() {
  const [filtroEstatus, setFiltroEstatus] = useState<PQFilterValue>('todas');

  const columns = useMemo(() => getPQOrderColumns(), []);

  // Datos filtrados según la pestaña activa
  const pedidosFiltrados = useMemo(() => {
    if (filtroEstatus === 'todas') return MOCK_PQ_ORDERS;
    return MOCK_PQ_ORDERS.filter((p) => p.estatus === filtroEstatus);
  }, [filtroEstatus]);

  return (
    <div className="space-y-5">

      {/* ── Filtros de estatus / paso del flujo ──────────────────────── */}
      <div
        className="flex items-center gap-1.5 flex-wrap"
        role="group"
        aria-label="Filtrar por estatus del flujo de Pedido PQ"
      >
        {FILTROS.map((f) => {
          const count =
            f.value === 'todas'
              ? MOCK_PQ_ORDERS.length
              : MOCK_PQ_ORDERS.filter((p) => p.estatus === f.value).length;

          // Ocultar pestañas sin datos (excepto "Todas")
          if (count === 0 && f.value !== 'todas') return null;

          const isActive = filtroEstatus === f.value;

          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFiltroEstatus(f.value)}
              className={`
                inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold
                transition-colors duration-150 cursor-pointer whitespace-nowrap
                ${isActive
                  ? FILTRO_ACTIVO_CLS
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                }
              `}
              aria-pressed={isActive}
            >
              {f.label}
              <span
                className={`
                  inline-flex items-center justify-center rounded-full min-w-4.5 h-4.5 px-1 text-[10px] font-bold
                  ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'}
                `}
                aria-hidden="true"
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Tabla de Pedidos PQ ───────────────────────────────────────── */}
      <DataTable columns={columns} data={pedidosFiltrados} />
    </div>
  );
}
