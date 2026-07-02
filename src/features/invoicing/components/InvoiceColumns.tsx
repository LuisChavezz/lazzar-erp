"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Factura } from "../interfaces/invoice.interface";
import { ViewIcon } from "../../../components/Icons";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "../../../components/DialogHeader";
import { InvoiceDetails } from "./InvoiceDetails";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { formatCurrency, safeParseAmount } from "@/src/utils/formatCurrency";
import { formatLocalDate } from "@/src/utils/formatDate";

// ── Configuración visual por estatus ──────────────────────────────────────────

const STATUS_CFG: Record<string, { cls: string; dot: string }> = {
  Emitida: {
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  Pagada: {
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  Vencida: {
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-400",
  },
  Cancelada: {
    cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    dot: "bg-red-500",
  },
};

const DEFAULT_STATUS_CFG = {
  cls: "bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300",
  dot: "bg-slate-400",
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CFG[status] ?? DEFAULT_STATUS_CFG;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cfg.cls}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`}
        aria-hidden="true"
      />
      {status || "—"}
    </span>
  );
};

// ── Celda de acciones ─────────────────────────────────────────────────────────

const ActionsCell = ({ invoice }: { invoice: Factura }) => {
  const [isViewOpen, setIsViewOpen] = useState(false);

  const menuItems: ActionMenuItem[] = [
    {
      label: "Ver Detalles",
      icon: ViewIcon,
      onSelect: () => setIsViewOpen(true),
    },
  ];

  return (
    <div className="flex justify-center">
      <ActionMenu items={menuItems} ariaLabel={`Acciones de la factura ${invoice.folio}`} />
      <MainDialog
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        maxWidth="900px"
        title={
          <DialogHeader
            title="Detalles de Facturación"
            subtitle="Información completa del registro"
            statusColor="sky"
          />
        }
      >
        <InvoiceDetails invoice={invoice} />
      </MainDialog>
    </div>
  );
};

// ── Columnas ──────────────────────────────────────────────────────────────────

export const invoiceColumns: ColumnDef<Factura>[] = [
  {
    accessorKey: "folio",
    header: "Folio",
    cell: ({ row }) => (
      <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
        {row.getValue("folio")}
      </span>
    ),
  },
  {
    accessorKey: "cliente_nombre",
    header: "Cliente",
    cell: ({ row }) => (
      <span className="text-slate-700 dark:text-slate-200 font-medium">
        {row.getValue("cliente_nombre")}
      </span>
    ),
  },
  {
    accessorKey: "fecha_emision",
    header: "Fecha emisión",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300 tabular-nums">
        {formatLocalDate(row.original.fecha_emision)}
      </span>
    ),
  },
  {
    accessorKey: "fecha_vencimiento",
    header: "Fecha vencimiento",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300 tabular-nums">
        {formatLocalDate(row.original.fecha_vencimiento)}
      </span>
    ),
  },
  {
    accessorKey: "total",
    header: "Total",
    // `total` es un string numérico; ordenamos numéricamente en vez de por
    // el orden alfanumérico que TanStack infiere para strings.
    sortingFn: (rowA, rowB) =>
      safeParseAmount(rowA.original.total) - safeParseAmount(rowB.original.total),
    cell: ({ row }) => (
      <div className="text-right font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
        {formatCurrency(safeParseAmount(row.original.total))}
      </div>
    ),
  },
  {
    accessorKey: "estatus",
    header: "Estatus",
    cell: ({ row }) => <StatusBadge status={row.original.estatus} />,
  },
  {
    accessorKey: "moneda_nombre",
    header: "Moneda",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("moneda_nombre")}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => <ActionsCell invoice={row.original} />,
  },
];
