"use client";

import { useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { ChevronRightIcon, UserIcon, ViewIcon } from "@/src/components/Icons";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import { formatShortDate, formatShortTime } from "@/src/utils/formatDate";
import { TRANSFER_STATUS_CONFIG } from "../constants/transferStatus";
import { StockTransferDetailDialog } from "./StockTransferDetailDialog";
import type { TransferenciaListItem } from "../interfaces/stock-transfer.interface";

// ── Celda de acciones ────────────────────────────────────────────────────────

const ActionsCell = ({ row }: { row: TransferenciaListItem }) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const menuItems: ActionMenuItem[] = [
    { label: "Ver Detalles", icon: ViewIcon, onSelect: () => setIsDetailOpen(true) },
  ];

  return (
    <div className="flex items-center justify-center">
      <ActionMenu items={menuItems} ariaLabel={`Acciones de ${row.folio}`} />
      {/* Montaje condicional: el diálogo —y con él su `useTransferenciaDetail`—
          no existe hasta abrirlo, así que renderizar la tabla no dispara
          ninguna petición de detalle. Mismo patrón que `AccountsReceivableColumns`. */}
      {isDetailOpen && (
        <StockTransferDetailDialog
          transferId={row.id}
          open={true}
          onOpenChange={setIsDetailOpen}
        />
      )}
    </div>
  );
};

const columnHelper = createColumnHelper<TransferenciaListItem>();

export const stockTransfersColumns = [
  columnHelper.accessor("folio", {
    header: "Folio",
    cell: (info) => (
      <span className="font-mono text-slate-700 dark:text-slate-200 font-semibold">
        {info.getValue()}
      </span>
    ),
  }),
  // Columna `accessor` (no `display`) con un valor combinado origen+destino para
  // que la búsqueda global de `DataTable` la incluya — el placeholder promete
  // buscar por "almacén". La celda sigue pintando el layout con chevron.
  columnHelper.accessor(
    (row) => `${row.almacen_origen_nombre} ${row.almacen_destino_nombre}`,
    {
      id: "ruta",
      header: "Origen → Destino",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200">
          <span>{row.original.almacen_origen_nombre}</span>
          <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
          <span>{row.original.almacen_destino_nombre}</span>
        </div>
      ),
    }
  ),
  columnHelper.accessor("status", {
    header: "Estatus",
    cell: (info) => <StatusBadge status={info.getValue()} config={TRANSFER_STATUS_CONFIG} />,
  }),
  columnHelper.accessor("usuario_nombre", {
    header: "Usuario",
    cell: (info) => (
      <div className="flex items-center gap-1.5">
        <UserIcon className="w-3 h-3 shrink-0 text-slate-400" />
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
          {info.getValue()}
        </span>
      </div>
    ),
  }),
  columnHelper.accessor("fecha_creacion", {
    header: "Fecha",
    sortingFn: "datetime",
    cell: (info) => {
      const raw = info.getValue();
      return (
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {formatShortDate(raw)}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            {formatShortTime(raw)}
          </span>
        </div>
      );
    },
  }),
  columnHelper.accessor("observaciones", {
    header: "Observaciones",
    cell: (info) => (
      <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-60 block">
        {info.getValue() || "—"}
      </span>
    ),
  }),
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => <ActionsCell row={row.original} />,
  }),
] as ColumnDef<TransferenciaListItem>[];
