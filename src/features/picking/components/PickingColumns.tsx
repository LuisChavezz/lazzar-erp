"use client";

import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { UserIcon, ViewIcon } from "@/src/components/Icons";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import { formatShortDate } from "@/src/utils/formatDate";
import {
  PICKING_PRIORIDAD_CONFIG,
  pickingPrioridadRank,
} from "../constants/pickingPrioridad";
import { PICKING_STATUS_CONFIG } from "../constants/pickingStatus";
import { PedidoFolioLink } from "@/src/features/orders/components/PedidoFolioLink";
import type { PickingRow } from "../interfaces/picking.interface";

// ── Celda de acciones ────────────────────────────────────────────────────────

/**
 * Callbacks de la tabla. El diálogo de detalle NO vive en la celda (las celdas
 * se desmontan al ordenar, filtrar, paginar o cuando la fila cambia tras un
 * refetch): lo monta `PickingView`, que guarda solo el id del surtido abierto.
 */
export interface PickingColumnsCallbacks {
  onViewDetail: (pickingId: number) => void;
}

const ActionsCell = ({
  row,
  onViewDetail,
}: {
  row: PickingRow;
  onViewDetail: PickingColumnsCallbacks["onViewDetail"];
}) => {
  const menuItems: ActionMenuItem[] = [
    { label: "Ver Detalles", icon: ViewIcon, onSelect: () => onViewDetail(row.id) },
  ];

  return (
    <div className="flex items-center justify-center">
      <ActionMenu items={menuItems} ariaLabel={`Acciones de ${row.folio}`} />
    </div>
  );
};

const columnHelper = createColumnHelper<PickingRow>();

export const getPickingColumns = ({ onViewDetail }: PickingColumnsCallbacks) =>
  [
    columnHelper.accessor("folio", {
      header: "Folio",
      // Abre el mismo detalle que "Ver Detalles" del menú de acciones.
      cell: (info) => (
        <button
          type="button"
          title="Ver detalle"
          onClick={() => onViewDetail(info.row.original.id)}
          className="font-mono text-slate-700 dark:text-slate-200 font-semibold hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer"
        >
          {info.getValue()}
        </button>
      ),
    }),
    columnHelper.accessor("pedido_folio", {
      header: "Pedido",
      cell: (info) => (
        <PedidoFolioLink
          pedidoId={info.row.original.pedido}
          folio={info.getValue()}
          from="picking"
        />
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
    // `created_at` es un timestamp real (con hora y offset), así que va SIN
    // `timeZone: "UTC"`: el día se pinta en la zona del usuario (ver
    // `formatShortDate`). Se ordena sobre el ISO crudo, no sobre el texto
    // formateado. Misma convención que la columna "Creado" de Embarque
    // (`PackingColumns`).
    columnHelper.accessor("created_at", {
      header: "Fecha de creación",
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
      cell: ({ row }) => <ActionsCell row={row.original} onViewDetail={onViewDetail} />,
    }),
  ] as ColumnDef<PickingRow>[];
