"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import type { Receipt } from "../interfaces/receipt.interface";
import { StatusBadge, type StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import { ReceiptDetailDialog } from "./ReceiptDetailDialog";
import { ReceiptActionsCell } from "./ReceiptActionsCell";

const columnHelper = createColumnHelper<Receipt>();

// ── Badge de tipo de origen ─────────────────────────────────────────────────
const TIPO_ORIGEN_CFG: Record<string, StatusBadgeConfigEntry> = {
  OC: {
    label: "Orden de Compra",
    cls: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  OP: {
    label: "Orden de Producción",
    cls: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
    dot: "bg-purple-500",
  },
};
const TIPO_ORIGEN_DESCONOCIDO_CFG: StatusBadgeConfigEntry = {
  label: "Desconocido",
  cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
  dot: "bg-slate-400",
};

// ── Badge de estatus ─────────────────────────────────────────────────────────
// No existe un mapa de etiquetas/colores por valor de `estatus` para este
// recurso; se reutiliza el fallback neutro de StatusBadge en vez de pintar un
// pill a mano.
const estatusDefaultConfig = (estatus: number): StatusBadgeConfigEntry => ({
  label: `Estatus ${estatus}`,
  cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
  dot: "bg-slate-400",
});

export const receiptColumns = [
  columnHelper.accessor("folio", {
    header: "Folio",
    cell: (info) => (
      <span className="font-mono text-slate-700 dark:text-slate-200 font-semibold">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("tipo_origen", {
    header: "Tipo de Recepción",
    cell: (info) => (
      <StatusBadge
        status={info.getValue()}
        config={TIPO_ORIGEN_CFG}
        defaultConfig={TIPO_ORIGEN_DESCONOCIDO_CFG}
      />
    ),
  }),
  columnHelper.accessor("proveedor_nombre", {
    header: "Proveedor",
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300">
        {info.getValue() ?? "—"}
      </span>
    ),
  }),
  columnHelper.accessor("fecha_recepcion", {
    header: "Fecha Recepción",
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300 tabular-nums">
        {info.getValue()
          ? new Date(info.getValue()).toLocaleDateString("es-MX")
          : "—"}
      </span>
    ),
  }),
  columnHelper.accessor("remision", {
    header: "Remisión",
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300">
        {info.getValue() ?? "—"}
      </span>
    ),
  }),
  columnHelper.accessor("factura_referencia", {
    header: "Factura",
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300">
        {info.getValue() ?? "—"}
      </span>
    ),
  }),
  columnHelper.accessor("estatus", {
    header: "Estatus",
    cell: (info) => (
      <StatusBadge
        status={String(info.getValue())}
        config={{}}
        defaultConfig={estatusDefaultConfig(info.getValue())}
      />
    ),
  }),
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => (
      <ReceiptActionsCell row={row.original} DetailDialog={ReceiptDetailDialog} />
    ),
  }),
] as ColumnDef<Receipt>[];
