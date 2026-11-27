"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import { FilterHeader } from "@/src/components/ColumnHeaderFilter";
import { ColumnHeaderDateRangeFilter } from "@/src/components/ColumnHeaderDateRangeFilter";
import { StatusBadge } from "@/src/components/StatusBadge";
import { BanIcon, ViewIcon } from "@/src/components/Icons";
import { ALL_FILTER_OPTION } from "@/src/utils/columnFilterOptions";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { rowBalance } from "../utils/rfidReconciliationBalance";
import { formatShortDateTime } from "@/src/utils/formatDate";
import { SupplierCatalogHeaderFilter } from "@/src/features/suppliers/components/SupplierCatalogHeaderFilter";
import { WarehouseCatalogHeaderFilter } from "@/src/features/warehouses/components/WarehouseCatalogHeaderFilter";
import type { RfidReconciliationRow } from "../interfaces/rfid-reconciliation.interface";
import {
  RFID_RECONCILIATION_ESTATUS_VALUES,
  RFID_RECONCILIATION_STATUS_CONFIG,
  RFID_RECONCILIATION_TIPO_ORIGEN_LABELS,
  RFID_RECONCILIATION_TIPO_ORIGEN_VALUES,
  rfidReconciliationActions,
  rfidReconciliationOriginFolio,
} from "../constants/rfidReconciliations";
import { useRfidReconciliationRowActionsContext } from "../hooks/rfidReconciliationRowActionsContext";

/**
 * Primera columna: el número del encuadre ES el menú de acciones de la fila
 * (estándar de tabla, `FolioActionMenu`) con el estatus debajo. El encuadre no
 * tiene folio propio: se nombra por su id y por el folio de su orden (columna
 * siguiente). "Cancelar" solo con `C-WMS-RECEPCIONES`, en Pendiente o Aceptado;
 * aceptar y leer etiquetas se hacen en el detalle.
 */
function FolioCell({ row }: { row: RfidReconciliationRow }) {
  const { onViewDetail, onCancel, canWrite } = useRfidReconciliationRowActionsContext();
  const items: ActionMenuItem[] = [
    { label: "Ver detalle", icon: ViewIcon, onSelect: () => onViewDetail(row) },
    {
      label: "Cancelar encuadre",
      icon: BanIcon,
      tone: "danger",
      visible: canWrite && rfidReconciliationActions(row.estatus).canCancel,
      onSelect: () => onCancel(row),
    },
  ];
  return (
    <FolioActionMenu
      folio={`#${row.id}`}
      items={items}
      status={<StatusBadge status={row.estatus} config={RFID_RECONCILIATION_STATUS_CONFIG} />}
    />
  );
}

/** Los estatus con su punto de color: el menú es la leyenda. */
const ESTATUS_OPTIONS = [
  ALL_FILTER_OPTION,
  ...RFID_RECONCILIATION_ESTATUS_VALUES.map((estatus) => ({
    value: estatus,
    label: RFID_RECONCILIATION_STATUS_CONFIG[estatus].label ?? estatus,
    dotClassName: RFID_RECONCILIATION_STATUS_CONFIG[estatus].dot,
  })),
];

const TIPO_ORIGEN_OPTIONS = [
  ALL_FILTER_OPTION,
  ...RFID_RECONCILIATION_TIPO_ORIGEN_VALUES.map((tipo) => ({
    value: tipo,
    label: RFID_RECONCILIATION_TIPO_ORIGEN_LABELS[tipo],
  })),
];

/**
 * Leído ASIGNADO / esperado (`rowBalance`): `total_leido` y `completo` del
 * backend cuentan también las lecturas sin asignar, que van aparte. Verde solo
 * si cuadra sin nada sin asignar.
 */
function ProgressCell({ row }: { row: RfidReconciliationRow }) {
  const balance = rowBalance(row);
  return (
    <div className="flex flex-col items-end leading-tight">
      <span
        className={`tabular-nums font-semibold ${
          balance.cuadra ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-white"
        }`}
      >
        {formatExactQuantityValue(balance.leido)} / {formatExactQuantityValue(balance.esperado)}
      </span>
      {balance.sinAsignar > 0 && (
        <span className="text-[11px] tabular-nums text-amber-600 dark:text-amber-400">
          {formatExactQuantityValue(balance.sinAsignar)} sin asignar
        </span>
      )}
    </div>
  );
}

/**
 * Columnas del listado en MODO SERVIDOR (`useRfidReconciliationsTable`): el
 * backend filtra, busca, ordena y pagina. Las opciones de proveedor y almacén
 * salen de sus catálogos, nunca de las filas.
 */
export const rfidReconciliationColumns: ColumnDef<RfidReconciliationRow>[] = [
  {
    id: "folio",
    accessorFn: (row) => row.id,
    meta: { label: "Encuadre", serverSort: "id", serverFilter: "estatus" },
    header: ({ column }) => <FilterHeader title="Encuadre" column={column} options={ESTATUS_OPTIONS} label="estatus" />,
    cell: ({ row }) => <FolioCell row={row.original} />,
  },
  {
    id: "origen",
    accessorFn: (row) => rfidReconciliationOriginFolio(row) ?? "",
    // Sin `serverSort`: el folio sale de la OC o de la OP y el backend ordena
    // por cada uno por separado.
    meta: { label: "Orden de origen", serverFilter: "tipo_origen" },
    header: ({ column }) => (
      <FilterHeader title="Orden de origen" column={column} options={TIPO_ORIGEN_OPTIONS} label="tipo de origen" />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col leading-tight">
        <span className="font-mono text-slate-700 dark:text-slate-200">
          {rfidReconciliationOriginFolio(row.original) ?? "—"}
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {RFID_RECONCILIATION_TIPO_ORIGEN_LABELS[row.original.tipo_origen] ?? row.original.tipo_origen}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "proveedor_nombre",
    meta: { label: "Proveedor", serverSort: "proveedor__nombre", serverFilter: "proveedor" },
    header: ({ column }) => <SupplierCatalogHeaderFilter column={column} title="Proveedor" />,
    cell: ({ row }) => (
      <span className="text-slate-700 dark:text-slate-200">{row.original.proveedor_nombre || "—"}</span>
    ),
  },
  {
    accessorKey: "almacen_nombre",
    meta: { label: "Almacén", serverSort: "almacen__nombre", serverFilter: "almacen" },
    header: ({ column }) => <WarehouseCatalogHeaderFilter column={column} title="Almacén" />,
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">{row.original.almacen_nombre || "—"}</span>
    ),
  },
  {
    id: "lectura",
    accessorFn: (row) => row.total_leido,
    header: "Asignado / esperado",
    meta: { label: "Asignado / esperado", align: "right" },
    cell: ({ row }) => <ProgressCell row={row.original} />,
  },
  {
    accessorKey: "fecha_recepcion",
    meta: { label: "Fecha", serverSort: "fecha_recepcion" },
    header: () => (
      <div className="flex items-center gap-1.5">
        <span>Fecha</span>
        <ColumnHeaderDateRangeFilter label="fecha del encuadre" fromKey="fecha_desde" toKey="fecha_hasta" menuAlign="end" />
      </div>
    ),
    cell: ({ row }) => (
      <span className="tabular-nums text-slate-600 dark:text-slate-300">
        {formatShortDateTime(row.original.fecha_recepcion ?? row.original.created_at)}
      </span>
    ),
  },
];
