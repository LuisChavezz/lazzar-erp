"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Order } from "../../dashboard/interfaces/order.interface";
import { getStatusStyles } from "../../dashboard/utils/getStatusStyle";
import { EditIcon, ViewIcon } from "../../../components/Icons";

export const orderColumns: ColumnDef<Order>[] = [
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.getValue("status") as Order["status"];
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyles(
            status
          )}`}
        >
          {status}
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
    accessorKey: "client",
    header: "Razón Social",
    cell: ({ row }) => {
      const client = row.original.client;
      return (
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${client.colorClass}`}
          >
            {client.initials}
          </div>
          <span className="text-slate-600 dark:text-slate-300">
            {client.name}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "pieces",
    header: "Piezas",
    cell: ({ row }) => (
      <div className="text-center text-slate-500 dark:text-slate-400">
        {row.original.pieces.toLocaleString("es-MX")}
      </div>
    ),
  },
  {
    accessorKey: "seller",
    header: "Vendedor",
    cell: ({ row }) => (
      <div className="text-slate-500 dark:text-slate-400">
        {row.getValue("seller")}
      </div>
    ),
  },
  {
    accessorKey: "date",
    header: "Fecha",
    cell: ({ row }) => (
      <div className="text-slate-500 dark:text-slate-400">
        {row.getValue("date")}
      </div>
    ),
  },
  {
    accessorKey: "classification",
    header: "Clasificación",
    cell: ({ row }) => (
      <div className="text-slate-500 dark:text-slate-400">
        {row.getValue("classification")}
      </div>
    ),
  },
  {
    accessorKey: "amount",
    header: "Importe sin IVA",
    cell: ({ row }) => (
      <div className="text-right font-medium text-slate-700 dark:text-slate-200">
        {row.getValue("amount")}
      </div>
    ),
  },
  {
    accessorKey: "partiality",
    header: "Parcialidad",
    cell: ({ row }) => (
      <div className="text-center text-slate-500 dark:text-slate-400">
        {row.getValue("partiality")}
      </div>
    ),
  },
  {
    accessorKey: "deliveryDate",
    header: "F. entrega",
    cell: ({ row }) => (
      <div className="text-slate-500 dark:text-slate-400">
        {row.getValue("deliveryDate")}
      </div>
    ),
  },
  {
    accessorKey: "newDate",
    header: "Nueva fecha",
    cell: ({ row }) => (
      <div className="text-slate-500 dark:text-slate-400">
        {row.getValue("newDate")}
      </div>
    ),
  },
  {
    accessorKey: "zip",
    header: "C.P.",
    cell: ({ row }) => (
      <div className="text-slate-500 dark:text-slate-400">
        {row.getValue("zip")}
      </div>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: () => (
      <div className="flex items-center justify-center gap-2">
        <button
          className="p-1 cursor-pointer text-slate-400 hover:text-sky-600 transition-colors"
          title="Ver Detalles"
        >
          <ViewIcon className="w-5 h-5" />
        </button>
        <button
          className="p-1 cursor-pointer text-slate-400 hover:text-sky-600 transition-colors"
          title="Editar"
        >
          <EditIcon className="w-5 h-5" />
        </button>
      </div>
    ),
  },
];
