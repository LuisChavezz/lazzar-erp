"use client";

import { useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { UserIcon, ViewIcon } from "@/src/components/Icons";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import { formatShortDate } from "@/src/utils/formatDate";
import { PICKING_STATUS_CONFIG } from "../constants/pickingStatus";
import { PickingDetailDialog } from "./PickingDetailDialog";
import type { Picking } from "../interfaces/picking.interface";

// ── Celda de acciones ────────────────────────────────────────────────────────

const ActionsCell = ({ row }: { row: Picking }) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const menuItems: ActionMenuItem[] = [
    { label: "Ver Detalles", icon: ViewIcon, onSelect: () => setIsDetailOpen(true) },
  ];

  return (
    <div className="flex items-center justify-center">
      <ActionMenu items={menuItems} ariaLabel={`Acciones de ${row.folio}`} />
      {/* Montaje condicional: el diálogo no existe hasta abrirlo. Sin fetch
          propio — `row` YA es el objeto completo (`picking_detalle` incluido),
          la misma forma que devuelve el detalle (ver nota en
          `picking.interface.ts`), así que no dispara ninguna petición nueva. */}
      {isDetailOpen && (
        <PickingDetailDialog picking={row} open={true} onOpenChange={setIsDetailOpen} />
      )}
    </div>
  );
};

const columnHelper = createColumnHelper<Picking>();

export const pickingColumns = [
  columnHelper.accessor("folio", {
    header: "Folio",
    cell: (info) => (
      <span className="font-mono text-slate-700 dark:text-slate-200 font-semibold">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("pedido_folio", {
    header: "Pedido",
    cell: (info) => (
      <span className="font-mono text-sm text-slate-600 dark:text-slate-300">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("almacen_nombre", {
    header: "Almacén",
    cell: (info) => (
      <span className="text-sm text-slate-700 dark:text-slate-200">{info.getValue()}</span>
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
  columnHelper.accessor("estado", {
    header: "Estatus",
    cell: (info) => <StatusBadge status={info.getValue()} config={PICKING_STATUS_CONFIG} />,
  }),
  columnHelper.accessor("prioridad", {
    header: "Prioridad",
    cell: (info) => (
      <span className="text-sm text-slate-700 dark:text-slate-300">{info.getValue()}</span>
    ),
  }),
  // Columna con accessor DERIVADO (proporción completas/total, no el conteo
  // crudo) para que el sort refleje el avance real: ordenar por
  // `total_lineas_completas` a secas empataba pickings con distinto
  // `total_lineas` (p. ej. 5/5 y 5/20 ambos ordenaban como "5"), aunque uno
  // esté 100% surtido y el otro apenas 25%. `total_lineas > 0` siempre debería
  // cumplirse (el backend deriva las líneas del pedido), pero se guarda contra
  // división por cero por si acaso.
  columnHelper.accessor(
    (row) => (row.total_lineas > 0 ? row.total_lineas_completas / row.total_lineas : 0),
    {
      id: "avance",
      header: "Avance",
      cell: ({ row }) => (
        <span className="text-sm tabular-nums text-slate-700 dark:text-slate-300">
          {row.original.total_lineas_completas}/{row.original.total_lineas}
        </span>
      ),
    },
  ),
  columnHelper.accessor("fecha_limite", {
    header: "Fecha Límite",
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
] as ColumnDef<Picking>[];
