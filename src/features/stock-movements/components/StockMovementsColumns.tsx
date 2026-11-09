"use client";

import { useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { UserIcon, ViewIcon } from "@/src/components/Icons";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { formatShortDate } from "@/src/utils/formatDate";
import type { StockMovement } from "../interfaces/stock-movements.interface";
import { StockMovementDetailDialog } from "./StockMovementDetailDialog";
import { MOVEMENT_TYPE_CONFIG } from "../constants/movementTypes";

// ─── Helpers de formato ──────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Celda de acciones ───────────────────────────────────────────────────────

const ActionsCell = ({ row }: { row: StockMovement }) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const menuItems: ActionMenuItem[] = [
    {
      label: "Ver detalle",
      icon: ViewIcon,
      onSelect: () => setIsDetailOpen(true),
    },
  ];

  return (
    <div className="flex items-center justify-center">
      <ActionMenu items={menuItems} ariaLabel="Acciones de movimiento" />
      {isDetailOpen && (
        <StockMovementDetailDialog
          movementId={row.id}
          open={true}
          onOpenChange={setIsDetailOpen}
        />
      )}
    </div>
  );
};

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
                {formatShortDate(raw)}
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

    // ── Usuario ────────────────────────────────────────────────────────────
    columnHelper.accessor(
      (row) => row.usuario_nombre,
      {
        id: "usuario_nombre",
        header: "Usuario",
        meta: { label: "Usuario" } as const,
        cell: (info) => {
          const nombre = info.getValue();
          return (
            <div className="flex items-center gap-1.5">
              <UserIcon className="w-3 h-3 shrink-0 text-slate-400" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
                {nombre}
              </span>
            </div>
          );
        },
      }
    ),

    // ── Acciones ───────────────────────────────────────────────────────────
    columnHelper.display({
      id: "actions",
      header: "Acciones",
      size: 90,
      meta: { align: "center", label: "Acciones" } as const,
      cell: ({ row }) => <ActionsCell row={row.original} />,
    }),
  ] as ColumnDef<StockMovement>[];
}
