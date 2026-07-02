"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Invoice } from "../interfaces/invoice.interface";
import { ViewIcon } from "../../../components/Icons";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "../../../components/DialogHeader";
import { InvoiceDetails } from "./InvoiceDetails";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import { formatCurrency, safeParseAmount } from "@/src/utils/formatCurrency";
import { formatLocalDate } from "@/src/utils/formatDate";
import { INVOICE_STATUS_CONFIG } from "../constants/invoiceStatus";

// ── Celda de acciones ─────────────────────────────────────────────────────────

const ActionsCell = ({ invoice }: { invoice: Invoice }) => {
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

export const invoiceColumns: ColumnDef<Invoice>[] = [
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
        {formatCurrency(safeParseAmount(row.original.total), {
          currency: row.original.moneda_nombre,
        })}
      </div>
    ),
  },
  {
    accessorKey: "estatus",
    header: "Estatus",
    cell: ({ row }) => (
      <StatusBadge status={row.original.estatus} config={INVOICE_STATUS_CONFIG} />
    ),
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
