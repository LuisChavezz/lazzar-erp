"use client";

import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { MapPinIcon, UserIcon, ViewIcon } from "@/src/components/Icons";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import type { StockMovement } from "../interfaces/stock-movements.interface";

// ─── Tipos de movimiento ─────────────────────────────────────────────────────

export type MovementType = "ENTRADA" | "SALIDA" | "TRASPASO" | "AJUSTE";

// ─── Configuración de estilos por tipo de movimiento ────────────────────────

export const MOVEMENT_TYPE_CONFIG: Record<
  string,
  { label: string; dot: string; badgeClass: string; textClass: string }
> = {
  ENTRADA: {
    label: "Entrada",
    dot: "bg-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/50",
    textClass: "text-emerald-600 dark:text-emerald-400",
  },
  SALIDA: {
    label: "Salida",
    dot: "bg-red-500",
    badgeClass: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/50",
    textClass: "text-red-600 dark:text-red-400",
  },
  TRASPASO: {
    label: "Traspaso",
    dot: "bg-blue-500",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/50",
    textClass: "text-blue-600 dark:text-blue-400",
  },
  AJUSTE: {
    label: "Ajuste",
    dot: "bg-amber-500",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/50",
    textClass: "text-amber-600 dark:text-amber-400",
  },
};

// ─── Helpers de formato ──────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Columnas ────────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<StockMovement>();

export function getStockMovementsColumns() {
  return [
    // ── Fecha ──────────────────────────────────────────────────────────────
    columnHelper.accessor(
      (row) => row.fecha_movimiento,
      {
        id: "fecha",
        header: "Fecha",
        meta: { label: "Fecha" } as const,
        sortingFn: "datetime",
        cell: (info) => {
          const raw = info.getValue();
          return (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {formatDate(raw)}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                {formatTime(raw)}
              </span>
            </div>
          );
        },
      }
    ),

    // ── Tipo de movimiento ─────────────────────────────────────────────────
    columnHelper.accessor(
      (row) => row.tipo_movimiento,
      {
        id: "tipo_movimiento",
        header: "Tipo",
        meta: { label: "Tipo Movimiento" } as const,
        cell: (info) => {
          const tipo = info.getValue();
          const cfg = MOVEMENT_TYPE_CONFIG[tipo] ?? {
            label: tipo,
            dot: "bg-slate-400",
            badgeClass: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-300 dark:border-slate-800/50",
            textClass: "text-slate-600 dark:text-slate-400",
          };
          return (
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border leading-none ${cfg.badgeClass}`}>
                {cfg.label}
              </span>
            </div>
          );
        },
      }
    ),

    // ── Folio Referencia ───────────────────────────────────────────────────
    columnHelper.accessor(
      (row) => row.movimiento_info?.folio_referencia ?? null,
      {
        id: "folio_referencia",
        header: "Folio Ref",
        meta: { label: "Folio Referencia" } as const,
        cell: (info) => {
          const folio = info.getValue();
          if (!folio) {
            return (
              <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
            );
          }
          return (
            <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 tracking-wider">
              {folio}
            </span>
          );
        },
      }
    ),

    // ── Origen / Destino ───────────────────────────────────────────────────
    columnHelper.accessor(
      (row) => row.movimiento_info ?? null,
      {
        id: "origen_destino",
        header: "Origen / Destino",
        meta: { label: "Origen / Destino" } as const,
        cell: (info) => {
          const movInfo = info.getValue();
          const origen = movInfo?.origen;
          const destino = movInfo?.destino;

          if (!origen && !destino) {
            return (
              <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
            );
          }

          return (
            <div className="flex flex-col gap-0.5 min-w-0">
              {origen && (
                <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <MapPinIcon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{origen.nombre}</span>
                </div>
              )}
              {destino && (
                <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="w-3 shrink-0 text-center text-[10px] text-slate-300 dark:text-slate-600">→</span>
                  <span className="truncate">{destino.nombre}</span>
                </div>
              )}
            </div>
          );
        },
      }
    ),

    // ── Mutación de Stock ──────────────────────────────────────────────────
    columnHelper.accessor(
      (row) => row.movimiento_info?.mutaciones ?? null,
      {
        id: "mutacion_stock",
        header: "Mutación Stock",
        meta: { label: "Mutación Stock" } as const,
        cell: (info) => {
          const mutaciones = info.getValue();
          if (!mutaciones || mutaciones.length === 0) {
            return (
              <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
            );
          }

          return (
            <div className="flex flex-col gap-0.5 min-w-0">
              {mutaciones.map((mut, idx) => {
                const isPositive = mut.cantidad > 0;
                const isNegative = mut.cantidad < 0;
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-1 text-[11px]"
                  >
                    <span
                      className={`font-mono font-semibold ${
                        isPositive
                          ? "text-emerald-600 dark:text-emerald-400"
                          : isNegative
                          ? "text-red-600 dark:text-red-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {mut.cantidad.toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {mut.unidad}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        },
      }
    ),

    // ── Usuario ────────────────────────────────────────────────────────────
    columnHelper.accessor(
      (row) => row.usuario_info ?? null,
      {
        id: "usuario",
        header: "Usuario",
        meta: { label: "Usuario" } as const,
        cell: (info) => {
          const user = info.getValue();
          if (!user) {
            return (
              <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
            );
          }
          return (
            <div className="flex items-center gap-1.5">
              <UserIcon className="w-3 h-3 shrink-0 text-slate-400" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
                {user.nombre}
              </span>
            </div>
          );
        },
      }
    ),

    // ── Acciones ───────────────────────────────────────────────────────────
    columnHelper.display({
      id: "actions",
      header: () => <div className="text-center">Acciones</div>,
      size: 90,
      meta: { label: "Acciones" } as const,
      cell: () => {
        const actionItems: ActionMenuItem[] = [
          {
            label: "Ver Detalles",
            icon: ViewIcon,
          },
        ];

        return (
          <div className="flex items-center justify-center">
            <ActionMenu items={actionItems} ariaLabel="Acciones de movimiento" />
          </div>
        );
      },
    }),
  ] as ColumnDef<StockMovement>[];
}
