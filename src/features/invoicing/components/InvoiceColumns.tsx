"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Invoice } from "../interfaces/invoice.interface";
import { EditIcon, ViewIcon } from "../../../components/Icons";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "../../../components/DialogHeader";

const InvoiceDetails = ({ invoice }: { invoice: Invoice }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <p className="text-xs uppercase text-slate-400 font-semibold">Pedido</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">
            {invoice.pedido}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <p className="text-xs uppercase text-slate-400 font-semibold">Factura</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">
            {invoice.factura}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <p className="text-xs uppercase text-slate-400 font-semibold">Cliente</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">
            {invoice.cliente}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <p className="text-xs uppercase text-slate-400 font-semibold">Vendedor</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">
            {invoice.vendedor}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <p className="text-xs uppercase text-slate-400 font-semibold">Paquetería</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">
            {invoice.paqueteria}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <p className="text-xs uppercase text-slate-400 font-semibold">Guías</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">
            {invoice.guias}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <p className="text-xs uppercase text-slate-400 font-semibold">Fecha</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">
            {invoice.date}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <p className="text-xs uppercase text-slate-400 font-semibold">Total</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">
            {invoice.total.toLocaleString("es-MX", {
              style: "currency",
              currency: "MXN",
            })}
          </p>
        </div>
      </div>
    </div>
  );
};

const ActionsCell = ({ invoice }: { invoice: Invoice }) => {
  const [isViewOpen, setIsViewOpen] = useState(false);

  return (
    <div className="flex items-center justify-center gap-2">
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
        trigger={
          <button
            className="p-1 cursor-pointer text-slate-400 hover:text-sky-600 transition-colors"
            title="Ver Detalles"
          >
            <ViewIcon className="w-5 h-5" />
          </button>
        }
      >
        <InvoiceDetails invoice={invoice} />
      </MainDialog>
      <button
        className="p-1 cursor-pointer text-slate-400 hover:text-sky-600 transition-colors"
        title="Editar"
      >
        <EditIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export const invoiceColumns: ColumnDef<Invoice>[] = [
  {
    accessorKey: "pedido",
    header: "Pedido",
    cell: ({ row }) => (
      <span className="font-medium text-slate-700 dark:text-slate-200">
        {row.getValue("pedido")}
      </span>
    ),
  },
  {
    accessorKey: "factura",
    header: "Factura",
    cell: ({ row }) => (
      <span className="text-slate-700 dark:text-slate-200 font-medium">
        {row.getValue("factura")}
      </span>
    ),
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => (
      <div className="text-right font-semibold text-slate-700 dark:text-slate-200">
        {row.original.total.toLocaleString("es-MX", {
          style: "currency",
          currency: "MXN",
        })}
      </div>
    ),
  },
  {
    accessorKey: "cliente",
    header: "Cliente",
    cell: ({ row }) => (
      <span className="text-slate-700 dark:text-slate-200 font-medium">
        {row.getValue("cliente")}
      </span>
    ),
  },
  {
    accessorKey: "vendedor",
    header: "Vendedor",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("vendedor")}
      </span>
    ),
  },
  {
    accessorKey: "paqueteria",
    header: "Paquetería",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("paqueteria")}
      </span>
    ),
  },
  {
    accessorKey: "guias",
    header: "Guías",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("guias")}
      </span>
    ),
  },
  {
    accessorKey: "date",
    header: "Fecha",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("date")}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => <ActionsCell invoice={row.original} />,
  },
];
