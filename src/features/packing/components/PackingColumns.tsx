"use client";

import { useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { UserIcon, ViewIcon } from "@/src/components/Icons";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { PACKING_STATUS_CONFIG } from "../constants/packingStatus";
import { PackingDetailDialog } from "./PackingDetailDialog";
import type { Packing } from "../interfaces/packing.interface";

// ── Celda de acciones ────────────────────────────────────────────────────────

const ActionsCell = ({ row }: { row: Packing }) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const menuItems: ActionMenuItem[] = [
    { label: "Ver Detalles", icon: ViewIcon, onSelect: () => setIsDetailOpen(true) },
  ];

  return (
    <div className="flex items-center justify-center">
      <ActionMenu items={menuItems} ariaLabel={`Acciones de ${row.folio}`} />
      {/* Montaje condicional: el diálogo no existe hasta abrirlo. Sin fetch
          propio — `row` YA es el objeto completo (`packing_detalle` incluido),
          la misma forma que devuelve el detalle (listado y detalle comparten
          `PackingSerializer` en el backend), así que no dispara ninguna
          petición nueva. */}
      {isDetailOpen && (
        <PackingDetailDialog packing={row} open={true} onOpenChange={setIsDetailOpen} />
      )}
    </div>
  );
};

const columnHelper = createColumnHelper<Packing>();

export const packingColumns = [
  columnHelper.accessor("folio", {
    header: "Folio",
    cell: (info) => (
      <span className="font-mono text-slate-700 dark:text-slate-200 font-semibold">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("picking_folio", {
    header: "Picking",
    cell: (info) => (
      <span className="font-mono text-sm text-slate-600 dark:text-slate-300">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("pedido_folio", {
    header: "Pedido",
    cell: (info) => (
      <span className="font-mono text-sm text-slate-600 dark:text-slate-300">
        {info.getValue() ?? "—"}
      </span>
    ),
  }),
  columnHelper.accessor("estado", {
    header: "Estatus",
    cell: (info) => <StatusBadge status={info.getValue()} config={PACKING_STATUS_CONFIG} />,
  }),
  columnHelper.accessor("numero_cajas", {
    header: "Cajas",
    cell: (info) => (
      <span className="text-sm tabular-nums text-slate-700 dark:text-slate-300">
        {info.getValue()}
      </span>
    ),
  }),
  // Columna combinada: peso y volumen son captura libre (no derivan de
  // registros reales de caja, `PackingCaja` no tiene API propia todavía), así
  // que se muestran tal cual, agrupados en una sola columna por densidad —
  // mismo criterio que la columna "Avance" de `PickingColumns`.
  columnHelper.display({
    id: "peso_volumen",
    header: "Peso / Volumen",
    cell: ({ row }) => (
      <span className="text-sm tabular-nums text-slate-700 dark:text-slate-300">
        {formatExactQuantityValue(row.original.peso_total)} kg ·{" "}
        {formatExactQuantityValue(row.original.volumen_total)} m³
      </span>
    ),
  }),
  columnHelper.accessor("operador_nombre", {
    header: "Operador",
    cell: (info) => (
      <div className="flex items-center gap-1.5">
        <UserIcon className="w-3 h-3 shrink-0 text-slate-400" />
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
          {info.getValue()}
        </span>
      </div>
    ),
  }),
  columnHelper.accessor("created_at", {
    header: "Creado",
    sortingFn: "datetime",
    cell: (info) => (
      <span className="text-sm text-slate-700 dark:text-slate-200">
        {formatShortDate(info.getValue())}
      </span>
    ),
  }),
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => <ActionsCell row={row.original} />,
  }),
] as ColumnDef<Packing>[];
