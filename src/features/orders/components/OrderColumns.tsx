"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Order } from "../interfaces/order.interface";
import { getStatusStyles } from "../utils/getStatusStyle";
import {
  CloseIcon,
  EditIcon,
  EmbarquesIcon,
  FacturacionIcon,
  ViewIcon,
} from "../../../components/Icons";
import { formatCurrency } from "../../../utils/formatCurrency";

const statusLabels: Record<Order["estatusPedido"], string> = {
  Pendiente: "Pendiente",
  Parcial: "Parcial",
  Completo: "Completo",
  Cancelado: "Cancelado",
};

export const orderColumns: ColumnDef<Order>[] = [
  {
    accessorKey: "estatusPedido",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.getValue("estatusPedido") as Order["estatusPedido"];
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyles(
            status
          )}`}
        >
          {statusLabels[status]}
        </span>
      );
    },
  },
  {
    accessorKey: "folio",
    header: "Folio",
    cell: ({ row }) => (
      <span className="font-medium text-slate-700 dark:text-slate-200">
        {row.getValue("folio")}
      </span>
    ),
  },
  {
    accessorKey: "clienteNombre",
    header: "Razón Social",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("clienteNombre")}
      </span>
    ),
  },
  {
    accessorKey: "agente",
    header: "Agente",
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">
        {row.getValue("agente")}
      </span>
    ),
  },
  {
    accessorKey: "fecha",
    header: "Fecha",
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">
        {row.getValue("fecha")}
      </span>
    ),
  },
  {
    accessorKey: "fechaVence",
    header: "Fecha Vence",
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">
        {row.getValue("fechaVence")}
      </span>
    ),
  },
  {
    id: "piezas",
    header: "Piezas",
    cell: ({ row }) => {
      const pieces = row.getValue("piezas") as number;
      return (
        <span className="text-slate-500 dark:text-slate-400">
          {pieces.toLocaleString("es-MX")}
        </span>
      );
    },
    accessorFn: (row) =>
      row.items.reduce((total, item) => total + item.cantidad, 0),
    sortingFn: "basic",
  },
  {
    accessorKey: "totals.subtotal",
    header: "Subtotal",
    cell: ({ row }) => (
      <div className="text-right font-medium text-slate-700 dark:text-slate-200">
        {formatCurrency(row.original.totals.subtotal)}
      </div>
    ),
  },
  {
    accessorKey: "totals.descuentoTotal",
    header: "Descuento",
    cell: ({ row }) => (
      <div className="text-right font-medium text-rose-500">
        -{formatCurrency(row.original.totals.descuentoTotal)}
      </div>
    ),
  },
  {
    accessorKey: "totals.ivaAmount",
    header: "IVA",
    cell: ({ row }) => (
      <div className="text-right font-medium text-slate-700 dark:text-slate-200">
        {formatCurrency(row.original.totals.ivaAmount)}
      </div>
    ),
  },
  {
    accessorKey: "totals.granTotal",
    header: "Total",
    cell: ({ row }) => (
      <div className="text-right font-semibold text-slate-800 dark:text-slate-100">
        {formatCurrency(row.original.totals.granTotal)}
      </div>
    ),
  },
  {
    accessorKey: "totals.saldoPendiente",
    header: "Saldo",
    cell: ({ row }) => (
      <div className="text-right text-slate-500 dark:text-slate-400">
        {formatCurrency(row.original.totals.saldoPendiente)}
      </div>
    ),
  },
  {
    id: "actions",
    header: () => (
      <div className="text-center" aria-label="Acciones de pedido">
        Acciones
      </div>
    ),
    size: 200,
    cell: ({ row }) => (
      <div className="flex items-center justify-center gap-2">
        <button
          className="p-1 cursor-pointer text-slate-400 hover:text-sky-600 transition-colors"
          title="Ver detalles del pedido"
          aria-label="Ver detalles del pedido"
          type="button"
        >
          <ViewIcon className="w-5 h-5" />
        </button>
        <Link
          href={`/orders/edit/${row.original.id}`}
          className="p-1 cursor-pointer text-slate-400 hover:text-sky-600 transition-colors"
          title="Editar pedido"
          aria-label="Editar pedido"
        >
          <EditIcon className="w-5 h-5" />
        </Link>
        <button
          className="p-1 cursor-pointer text-slate-400 hover:text-sky-600 transition-colors"
          title="Facturar"
          aria-label="Facturar pedido"
          type="button"
        >
          <FacturacionIcon className="w-5 h-5" />
        </button>
        <button
          className="p-1 cursor-pointer text-slate-400 hover:text-sky-600 transition-colors"
          title="Marcar como enviado"
          aria-label="Marcar pedido como enviado"
          type="button"
        >
          <EmbarquesIcon className="w-5 h-5" />
        </button>
        <button
          className="p-1 cursor-pointer text-slate-400 hover:text-rose-500 transition-colors"
          title="Cancelar"
          aria-label="Cancelar pedido"
          type="button"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>
    ),
  },
];
