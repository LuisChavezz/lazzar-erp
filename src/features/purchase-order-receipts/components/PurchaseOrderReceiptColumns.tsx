"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { PurchaseOrderReceipt } from "../interfaces/purchase-order-receipt.interface";
import { formatLocalDate } from "@/src/utils/formatDate";
import { StatusBadge, type StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import { ReceiptActionsCell } from "@/src/features/receipts/components/ReceiptActionsCell";
import { PurchaseOrderReceiptDetailDialog } from "./PurchaseOrderReceiptDetailDialog";

// ── Badge de estatus ─────────────────────────────────────────────────────────
// No existe un mapa de etiquetas/colores por estatus para este recurso; se
// reutiliza el fallback neutro de StatusBadge (mismo look que usa WMS) en vez
// de pintar un pill a mano.
const estatusDefaultConfig = (estatus: number): StatusBadgeConfigEntry => ({
  label: `Estatus ${estatus}`,
  cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
  dot: "bg-slate-400",
});

// ── Columnas ─────────────────────────────────────────────────────────────────
// Vista de Compras (solo lectura) sobre recepciones tipo OC. `PurchaseOrderReceipt`
// afirma que proveedor/orden de compra siempre están presentes en esta vista
// filtrada server-side, así que sus columnas no necesitan fallback `|| "—"`.

export const purchaseOrderReceiptColumns: ColumnDef<PurchaseOrderReceipt>[] = [
  {
    accessorKey: "folio",
    header: "Folio",
    cell: ({ row }) => (
      <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
        {row.getValue("folio") || "—"}
      </span>
    ),
  },
  {
    accessorKey: "orden_compra_folio",
    header: "Orden de Compra",
    cell: ({ row }) => (
      <span className="font-mono text-slate-600 dark:text-slate-300">
        {row.original.orden_compra_folio}
      </span>
    ),
  },
  {
    accessorKey: "proveedor_nombre",
    header: "Proveedor",
    cell: ({ row }) => (
      <span className="text-slate-700 dark:text-slate-200">
        {row.original.proveedor_nombre}
      </span>
    ),
  },
  {
    accessorKey: "almacen_nombre",
    header: "Almacén",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.original.almacen_nombre || "—"}
      </span>
    ),
  },
  {
    accessorKey: "fecha_recepcion",
    header: "Fecha de Recepción",
    cell: ({ row }) => (
      <span className="tabular-nums text-slate-600 dark:text-slate-300">
        {formatLocalDate(row.original.fecha_recepcion)}
      </span>
    ),
  },
  {
    accessorKey: "estatus",
    header: "Estatus",
    cell: ({ row }) => (
      <StatusBadge
        status={String(row.original.estatus)}
        config={{}}
        defaultConfig={estatusDefaultConfig(row.original.estatus)}
      />
    ),
  },
  {
    accessorKey: "remision",
    header: "Remisión",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.original.remision || "—"}
      </span>
    ),
  },
  {
    id: "acciones",
    header: () => <div className="text-center">Acciones</div>,
    size: 90,
    cell: ({ row }) => (
      <ReceiptActionsCell row={row.original} DetailDialog={PurchaseOrderReceiptDetailDialog} />
    ),
  },
];
