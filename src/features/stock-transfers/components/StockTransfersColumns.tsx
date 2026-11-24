"use client";

import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { ChevronRightIcon, UserIcon, ViewIcon } from "@/src/components/Icons";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import { textOrDash } from "@/src/components/DetailDialogPrimitives";
import { formatShortDate, formatShortTime } from "@/src/utils/formatDate";
import { TRANSFER_STATUS_CONFIG } from "../constants/transferStatus";
import type { TransferenciaListItem } from "../interfaces/stock-transfer.interface";

// ── Celda de acciones ────────────────────────────────────────────────────────

/**
 * Solo el menú: el estado del detalle vive en `StockTransfersView`, nunca en la
 * celda (las celdas se desmontan al ordenar, paginar o filtrar; revertir una TR
 * agrega una fila arriba y puede mover la abierta a otra página, EC-945).
 */
const ActionsCell = ({
  row,
  onOpenDetail,
}: {
  row: TransferenciaListItem;
  onOpenDetail: (transferId: number) => void;
}) => {
  const menuItems: ActionMenuItem[] = [
    { label: "Ver Detalles", icon: ViewIcon, onSelect: () => onOpenDetail(row.id) },
  ];

  return (
    <div className="flex items-center justify-center">
      <ActionMenu items={menuItems} ariaLabel={`Acciones de ${row.folio}`} />
    </div>
  );
};

const columnHelper = createColumnHelper<TransferenciaListItem>();

interface StockTransfersColumnsCallbacks {
  onOpenDetail: (transferId: number) => void;
}

export const getStockTransfersColumns = ({ onOpenDetail }: StockTransfersColumnsCallbacks) => [
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
  // `accessorFn` que colapsa `null` a `""` — mismo bug de
  // `getColumnCanGlobalFilter`/`flatRows[0]` que ya documenta
  // `CorteMangaOrderColumns.tsx` (mismo motivo que la columna `ruta` de
  // arriba). `id` explícito conserva la visibilidad/orden de columna que
  // guarda `DataTable`. `observaciones` es opcional al crear la transferencia,
  // así que llega nulo con frecuencia.
  columnHelper.accessor((row) => row.observaciones ?? "", {
    id: "observaciones",
    header: "Observaciones",
    cell: (info) => (
      <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-60 block">
        {textOrDash(info.getValue())}
      </span>
    ),
  }),
  columnHelper.display({
    id: "actions",
    header: "Acciones",
    meta: { align: "center" },
    cell: ({ row }) => <ActionsCell row={row.original} onOpenDetail={onOpenDetail} />,
  }),
] as ColumnDef<TransferenciaListItem>[];
