"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CustomerItem } from "../interfaces/customer.interface";
import { EditIcon, ViewIcon } from "../../../components/Icons";

export const customerColumns: ColumnDef<CustomerItem>[] = [
  {
    accessorKey: "razonSocial",
    header: "Razón social",
    cell: ({ row }) => (
      <span className="font-medium text-slate-700 dark:text-slate-200">
        {row.getValue("razonSocial")}
      </span>
    ),
  },
  {
    accessorKey: "contacto",
    header: "Contacto",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("contacto")}
      </span>
    ),
  },
  {
    accessorKey: "telefono",
    header: "Teléfono",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("telefono")}
      </span>
    ),
  },
  {
    accessorKey: "correo",
    header: "Correo",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("correo")}
      </span>
    ),
  },
  {
    accessorKey: "ultimaCompra",
    header: "Última compra",
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">
        {row.getValue("ultimaCompra")}
      </span>
    ),
  },
  {
    accessorKey: "ultimoPedido",
    header: "Último pedido",
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">
        {row.getValue("ultimoPedido")}
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
