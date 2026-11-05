"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { getReviewColumns } from "./PurchaseOrderReviewColumns";
import {
  REVIEW_STEPS,
  REVIEW_STATUS_LABELS,
  type PurchaseOrderReview,
  type ReviewStatus,
} from "../interfaces/purchase-order-review.interface";

// ── Tipos de filtro ───────────────────────────────────────────────────────────

type ReviewFilterValue = ReviewStatus | 'todas';

// Pestañas de filtro — cada paso canónico más los estados especiales
const FILTROS: { value: ReviewFilterValue; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  ...REVIEW_STEPS.map((s) => ({
    value: s as ReviewStatus,
    label: REVIEW_STATUS_LABELS[s],
  })),
  { value: 'completado',          label: 'Completadas' },
  { value: 'no_recontactar',      label: 'No Recontactar' },
  { value: 'material_no_recibido', label: 'Material No Recibido' },
  { value: 'cancelado',           label: 'Canceladas' },
];

// Clases para la pestaña activa
const FILTRO_ACTIVO_CLS = 'bg-sky-600 text-white';

// ── Componente principal ──────────────────────────────────────────────────────

interface PurchaseOrderReviewListProps {
  data: PurchaseOrderReview[];
}

/** Lista principal de revisiones de pedidos de compra con filtros por estatus */
export function PurchaseOrderReviewList({ data }: PurchaseOrderReviewListProps) {
  const [filtroEstatus, setFiltroEstatus] = useState<ReviewFilterValue>('todas');

  const columns = useMemo(() => getReviewColumns(), []);

  // Datos filtrados según la pestaña activa
  const revisionesFiltradas = useMemo(() => {
    if (filtroEstatus === 'todas') return data;
    return data.filter((r) => r.estatus === filtroEstatus);
  }, [data, filtroEstatus]);

  return (
    <div className="space-y-5">

      {/* ── Filtros de estatus / paso del flujo ──────────────────────── */}
      <div
        className="flex items-center gap-1.5 flex-wrap"
        role="group"
        aria-label="Filtrar por estatus del flujo de revisión de pedido"
      >
        {FILTROS.map((f) => {
          const count =
            f.value === 'todas'
              ? data.length
              : data.filter((r) => r.estatus === f.value).length;

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
        data={revisionesFiltradas}
        searchPlaceholder="Buscar folio, OC, proveedor..."
        baseDataCount={data.length}
      />
    </div>
  );
}
