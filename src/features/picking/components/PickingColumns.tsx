"use client";

import { useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { UserIcon, ViewIcon } from "@/src/components/Icons";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  PICKING_PRIORIDAD_CONFIG,
  pickingPrioridadRank,
} from "../constants/pickingPrioridad";
import { PICKING_STATUS_CONFIG } from "../constants/pickingStatus";
import { PickingDetailDialog } from "./PickingDetailDialog";
import type { PickingRow } from "../interfaces/picking.interface";

// ── Celda de acciones ────────────────────────────────────────────────────────

const ActionsCell = ({ row }: { row: PickingRow }) => {
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

const columnHelper = createColumnHelper<PickingRow>();

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
  // Badge de color (no texto plano) para que la urgencia se lea de un vistazo
  // en la tabla y no solo en el desglose de KPIs — misma fuente de color que
  // `PickingPriorityBreakdown` (`PICKING_PRIORIDAD_CONFIG`), así que "Alta" es
  // rose en ambos lugares.
  columnHelper.accessor("prioridad", {
    header: "Prioridad",
    // Sort por urgencia real, no alfabético sobre el string crudo (que
    // ordenaría ALTA → BAJA → MEDIA, dejando la más urgente junto a la menos).
    sortingFn: (a, b) =>
      pickingPrioridadRank(a.original.prioridad) -
      pickingPrioridadRank(b.original.prioridad),
    cell: (info) => <StatusBadge status={info.getValue()} config={PICKING_PRIORIDAD_CONFIG} />,
  }),
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => <ActionsCell row={row.original} />,
  }),
] as ColumnDef<PickingRow>[];
