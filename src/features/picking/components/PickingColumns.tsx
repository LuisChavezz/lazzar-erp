"use client";

import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { UserIcon, ViewIcon } from "@/src/components/Icons";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { FilterHeader } from "@/src/components/ColumnHeaderFilter";
import { StatusBadge } from "@/src/components/StatusBadge";
import { ALL_FILTER_OPTION } from "@/src/utils/columnFilterOptions";
import { formatShortDate } from "@/src/utils/formatDate";
import {
  PICKING_PRIORIDAD_CONFIG,
  PICKING_PRIORIDAD_ORDER,
} from "../constants/pickingPrioridad";
import { PICKING_STATUS_CONFIG } from "../constants/pickingStatus";
import { PICKING_ESTADO_VALUES } from "../utils/pickingList";
import { PedidoFolioLink } from "@/src/features/orders/components/PedidoFolioLink";
import type { PickingListItem } from "../interfaces/picking.interface";

// ── Opciones de los filtros de encabezado ────────────────────────────────────

// Del MISMO catálogo que pinta los badges, así que un estatus o una prioridad
// no pueden existir en la tabla sin existir en el filtro (ni al revés). Los
// `value` son los strings exactos del backend (`?estado=`, `?prioridad=`).
const ESTADO_OPTIONS = [
  ALL_FILTER_OPTION,
  ...PICKING_ESTADO_VALUES.map((value) => ({
    value,
    label: PICKING_STATUS_CONFIG[value].label ?? value,
    dotClassName: PICKING_STATUS_CONFIG[value].dot,
  })),
];

const PRIORIDAD_OPTIONS = [
  ALL_FILTER_OPTION,
  ...PICKING_PRIORIDAD_ORDER.map((value) => ({
    value,
    label: PICKING_PRIORIDAD_CONFIG[value].label,
    dotClassName: PICKING_PRIORIDAD_CONFIG[value].dot,
  })),
];

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
  row: PickingListItem;
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

const columnHelper = createColumnHelper<PickingListItem>();

/**
 * Columnas del listado de pickings, para la tabla en MODO SERVIDOR
 * (`usePickingsTable`): el backend filtra, busca, ordena y pagina, así que
 * ninguna columna filtra ni ordena en memoria.
 *
 * - `meta.serverSort` = el campo de `ordering` del backend (lista blanca en
 *   `pickingsTable`, `utils/pickingList.ts`); `prioridad` ordena por urgencia en el servidor.
 * - `meta.serverFilter` = la clave del filtro que controla el encabezado de
 *   esa columna. Sus opciones son fijas (los catálogos de estatus y
 *   prioridad), nunca de las filas: la tabla solo tiene una página.
 */
export const getPickingColumns = ({ onViewDetail }: PickingColumnsCallbacks) =>
  [
    columnHelper.accessor("folio", {
      header: "Folio",
      meta: { label: "Folio", serverSort: "folio" },
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
      meta: { label: "Pedido", serverSort: "pedido_folio" },
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
      meta: { label: "Operador", serverSort: "operador_nombre" },
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
      meta: { label: "Estatus", serverSort: "estado", serverFilter: "estado" },
      header: ({ column }) => (
        <FilterHeader title="Estatus" column={column} options={ESTADO_OPTIONS} label="estatus" />
      ),
      cell: (info) => <StatusBadge status={info.getValue()} config={PICKING_STATUS_CONFIG} />,
    }),
    // Badge de color (no texto plano) para que la urgencia se lea de un vistazo
    // en la tabla y no solo en el desglose de KPIs — misma fuente de color que
    // `PickingPriorityBreakdown` (`PICKING_PRIORIDAD_CONFIG`), así que "Alta" es
    // rose en ambos lugares.
    columnHelper.accessor("prioridad", {
      meta: { label: "Prioridad", serverSort: "prioridad", serverFilter: "prioridad" },
      header: ({ column }) => (
        <FilterHeader
          title="Prioridad"
          column={column}
          options={PRIORIDAD_OPTIONS}
          label="prioridad"
        />
      ),
      cell: (info) => <StatusBadge status={info.getValue()} config={PICKING_PRIORIDAD_CONFIG} />,
    }),
    // `created_at` es un timestamp real (con hora y offset), así que va SIN
    // `timeZone: "UTC"`: el día se pinta en la zona del usuario (ver
    // `formatShortDate`). Misma convención que la columna "Creado" de Embarque
    // (`PackingColumns`).
    columnHelper.accessor("created_at", {
      header: "Fecha de creación",
      meta: { label: "Fecha de creación", serverSort: "created_at" },
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
  ] as ColumnDef<PickingListItem>[];
