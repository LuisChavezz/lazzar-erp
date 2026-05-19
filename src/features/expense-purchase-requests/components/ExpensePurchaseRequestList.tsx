"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { MOCK_EXPENSE_PURCHASE_REQUESTS } from "../mocks/expense-purchase-request.mock";
import { getExpenseRequestColumns } from "./ExpensePurchaseRequestColumns";
import {
  EXPENSE_REQUEST_STEPS,
  EXPENSE_REQUEST_STATUS_LABELS,
  type ExpenseRequestStatus,
} from "../interfaces/expense-purchase-request.interface";

// ── Tipo del valor de filtro ──────────────────────────────────────────────────

type ExpenseFilterValue = ExpenseRequestStatus | 'todas';

// ── Definición de pestañas de filtro ─────────────────────────────────────────

const FILTROS: { value: ExpenseFilterValue; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  // Pasos canónicos del flujo
  ...EXPENSE_REQUEST_STEPS.map((s) => ({
    value: s as ExpenseRequestStatus,
    label: EXPENSE_REQUEST_STATUS_LABELS[s],
  })),
  // Estados especiales de cierre
  { value: 'completado', label: 'Completadas' },
  { value: 'rechazado',  label: 'Rechazadas'  },
  { value: 'cancelado',  label: 'Canceladas'  },
];

// Clase de la pestaña activa
const FILTRO_ACTIVO_CLS =
  'bg-sky-600 text-white dark:bg-sky-500 shadow-sm';

// ── Componente principal ──────────────────────────────────────────────────────

/** Lista de solicitudes de compras de gastos con filtros por estatus del flujo */
export function ExpensePurchaseRequestList() {
  const [filtroEstatus, setFiltroEstatus] = useState<ExpenseFilterValue>('todas');

  const columns = useMemo(() => getExpenseRequestColumns(), []);

  // Datos filtrados según la pestaña activa
  const solicitudesFiltradas = useMemo(() => {
    if (filtroEstatus === 'todas') return MOCK_EXPENSE_PURCHASE_REQUESTS;
    return MOCK_EXPENSE_PURCHASE_REQUESTS.filter((r) => r.estatus === filtroEstatus);
  }, [filtroEstatus]);

  return (
    <div className="space-y-5">

      {/* ── Filtros de estatus / paso del flujo ──────────────────────── */}
      <div
        className="flex items-center gap-1.5 flex-wrap"
        role="group"
        aria-label="Filtrar por estatus del flujo de solicitud de gasto"
      >
        {FILTROS.map((f) => {
          const count =
            f.value === 'todas'
              ? MOCK_EXPENSE_PURCHASE_REQUESTS.length
              : MOCK_EXPENSE_PURCHASE_REQUESTS.filter((r) => r.estatus === f.value).length;

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
                  inline-flex items-center justify-center min-w-4 h-4 rounded-full text-[10px] font-bold px-0.5
                  ${isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                  }
                `}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Tabla de datos ───────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={solicitudesFiltradas}
        searchPlaceholder="Buscar folio, proveedor, solicitante..."
        baseDataCount={MOCK_EXPENSE_PURCHASE_REQUESTS.length}
      />
    </div>
  );
}
