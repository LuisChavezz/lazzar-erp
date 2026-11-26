"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import { FilterHeader } from "@/src/components/ColumnHeaderFilter";
import { StatusBadge } from "@/src/components/StatusBadge";
import { BanIcon, ViewIcon } from "@/src/components/Icons";
import { ALL_FILTER_OPTION } from "@/src/utils/columnFilterOptions";
import { formatMoneyValueOrDash } from "@/src/utils/formatCurrency";
import { formatShortDateTime } from "@/src/utils/formatDate";
import { SupplierCatalogHeaderFilter } from "@/src/features/suppliers/components/SupplierCatalogHeaderFilter";
import type { SupplierReturn } from "../interfaces/supplier-return.interface";
import {
  SUPPLIER_RETURN_ESTATUS_VALUES,
  SUPPLIER_RETURN_STATUS_CONFIG,
  supplierReturnLabel,
} from "../constants/supplierReturns";
import { useSupplierReturnRowActionsContext } from "../hooks/supplierReturnRowActionsContext";

/**
 * Primera columna: el folio ES el menú de acciones de la fila (estándar de
 * tabla, `FolioActionMenu`) con el estatus debajo. "Ver detalle" abre el
 * diálogo de la lista; "Cancelar" solo con `C-WMS-RECEPCIONES` y si la
 * devolución sigue aplicada.
 */
function FolioCell({ dev }: { dev: SupplierReturn }) {
  const { onViewDetail, onCancel, canWrite } = useSupplierReturnRowActionsContext();
  const items: ActionMenuItem[] = [
    { label: "Ver detalle", icon: ViewIcon, onSelect: () => onViewDetail(dev) },
    {
      label: "Cancelar devolución",
      icon: BanIcon,
      tone: "danger",
      visible: canWrite && dev.estatus === "aplicada",
      onSelect: () => onCancel(dev),
    },
  ];
  return (
    <FolioActionMenu
      folio={supplierReturnLabel(dev)}
      items={items}
      status={<StatusBadge status={dev.estatus} config={SUPPLIER_RETURN_STATUS_CONFIG} />}
    />
  );
}

/** Los estatus del backend con su punto de color: el menú es la leyenda. */
const ESTATUS_OPTIONS = [
  ALL_FILTER_OPTION,
  ...SUPPLIER_RETURN_ESTATUS_VALUES.map((estatus) => ({
    value: estatus,
    label: SUPPLIER_RETURN_STATUS_CONFIG[estatus].label ?? estatus,
    dotClassName: SUPPLIER_RETURN_STATUS_CONFIG[estatus].dot,
  })),
];

/**
 * Columnas del listado en MODO SERVIDOR (`useSupplierReturnsTable`): el backend
 * filtra, busca, ordena y pagina. `meta.serverSort` es el campo de `ordering`
 * (lista blanca del backend) y `meta.serverFilter` la clave del filtro del
 * encabezado; las opciones salen de valores fijos o del catálogo de
 * proveedores, nunca de las filas.
 */
export const supplierReturnColumns: ColumnDef<SupplierReturn>[] = [
  {
    id: "folio",
    accessorFn: (row) => row.folio ?? "",
    meta: { label: "Folio", serverSort: "folio", serverFilter: "estatus" },
    header: ({ column }) => <FilterHeader title="Folio" column={column} options={ESTATUS_OPTIONS} label="estatus" />,
    cell: ({ row }) => <FolioCell dev={row.original} />,
  },
  {
    accessorKey: "recepcion_folio",
    header: "Recepción",
    meta: { label: "Recepción", serverSort: "recepcion__folio" },
    cell: ({ row }) => (
      <span className="font-mono text-slate-700 dark:text-slate-200">{row.original.recepcion_folio || "—"}</span>
    ),
  },
  {
    accessorKey: "orden_compra_folio",
    header: "Orden de compra",
    meta: { label: "Orden de compra", serverSort: "orden_compra__folio" },
    cell: ({ row }) => (
      <span className="font-mono text-slate-600 dark:text-slate-300">{row.original.orden_compra_folio || "—"}</span>
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
    accessorKey: "motivo",
    header: "Motivo",
    meta: { label: "Motivo", hideOnMobile: true },
    cell: ({ row }) => (
      <span className="block max-w-64 truncate text-slate-600 dark:text-slate-300" title={row.original.motivo}>
        {row.original.motivo || "—"}
      </span>
    ),
  },
  {
    accessorKey: "fecha",
    header: "Fecha",
    meta: { label: "Fecha", serverSort: "fecha" },
    cell: ({ row }) => (
      <span className="tabular-nums text-slate-600 dark:text-slate-300">{formatShortDateTime(row.original.fecha)}</span>
    ),
  },
  {
    accessorKey: "total",
    header: "Total (MXN)",
    // El backend valúa al costo MXN del renglón de la OC.
    meta: { label: "Total (MXN)", align: "right", serverSort: "total" },
    cell: ({ row }) => (
      <span className="tabular-nums font-semibold text-slate-800 dark:text-white">
        {formatMoneyValueOrDash(row.original.total, "MXN")}
      </span>
    ),
  },
];
