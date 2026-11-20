"use client";

import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { UserIcon, ViewIcon } from "@/src/components/Icons";
import { ActionMenu } from "@/src/components/ActionMenu";
import { FolioButton } from "@/src/components/FolioButton";
import { StatusBadge } from "@/src/components/StatusBadge";
import { PedidoFolioLink } from "@/src/features/orders/components/PedidoFolioLink";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { PACKING_STATUS_CONFIG } from "../constants/packingStatus";
import type { Packing } from "../interfaces/packing.interface";

const columnHelper = createColumnHelper<Packing>();

/**
 * Columnas del listado de embarques. El detalle (un solo diálogo, sin fetch
 * propio: la fila ya trae `packing_detalle`) vive en `PackingView`; el folio y
 * "Ver Detalles" llaman a `onViewDetail`.
 */
export const getPackingColumns = ({ onViewDetail }: { onViewDetail: (packing: Packing) => void }) => [
  columnHelper.accessor("folio", {
    header: "Folio",
    cell: ({ row, getValue }) => (
      <FolioButton folio={getValue()} onClick={() => onViewDetail(row.original)} />
    ),
  }),
  columnHelper.accessor("picking_folio", {
    header: "Surtido",
    cell: (info) => (
      <span className="font-mono text-sm text-slate-600 dark:text-slate-300">
        {info.getValue()}
      </span>
    ),
  }),
  // `accessorFn` que colapsa `null` a `""` — mismo bug de
  // `getColumnCanGlobalFilter`/`flatRows[0]` que ya documenta
  // `CorteMangaOrderColumns.tsx`. `id` explícito conserva la
  // visibilidad/orden de columna que guarda `DataTable`.
  columnHelper.accessor((row) => row.pedido_folio ?? "", {
    id: "pedido_folio",
    header: "Pedido",
    cell: (info) => (
      <PedidoFolioLink
        pedidoId={info.row.original.pedido}
        folio={info.row.original.pedido_folio}
        from="packing"
      />
    ),
  }),
  columnHelper.accessor("estado", {
    header: "Estatus",
    cell: (info) => <StatusBadge status={info.getValue()} config={PACKING_STATUS_CONFIG} />,
  }),
  columnHelper.accessor("numero_cajas", {
    header: "Cajas",
    meta: { align: "right" },
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
    id: "peso",
    header: "Peso",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="text-sm tabular-nums text-slate-700 dark:text-slate-300">
        {formatExactQuantityValue(row.original.peso_total)} kg
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
    header: "Acciones",
    meta: { align: "center" },
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <ActionMenu
          items={[{ label: "Ver Detalles", icon: ViewIcon, onSelect: () => onViewDetail(row.original) }]}
          ariaLabel={`Acciones de ${row.original.folio}`}
        />
      </div>
    ),
  }),
] as ColumnDef<Packing>[];
