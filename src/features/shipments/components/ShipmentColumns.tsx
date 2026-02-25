"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ShipmentItem } from "../interfaces/shipment.interface";
import { EditIcon, ViewIcon } from "../../../components/Icons";

export const shipmentColumns: ColumnDef<ShipmentItem>[] = [
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
    accessorKey: "fecha",
    header: "Fecha",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("fecha")}
      </span>
    ),
  },
  {
    accessorKey: "cliente",
    header: "Nombre del cliente",
    cell: ({ row }) => (
      <span className="text-slate-700 dark:text-slate-200 font-medium">
        {row.getValue("cliente")}
      </span>
    ),
  },
  {
    accessorKey: "factura",
    header: "Factura",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("factura")}
      </span>
    ),
  },
  {
    accessorKey: "importe",
    header: "Importe",
    cell: ({ row }) => (
      <div className="text-right font-semibold text-slate-700 dark:text-slate-200">
        {row.original.importe.toLocaleString("es-MX", {
          style: "currency",
          currency: "MXN",
        })}
      </div>
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
    accessorKey: "vendedor",
    header: "Vendedor",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("vendedor")}
      </span>
    ),
  },
  {
    accessorKey: "piezas",
    header: "Piezas",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.original.piezas.toLocaleString("es-MX")}
      </span>
    ),
  },
  {
    accessorKey: "packingList",
    header: "Packing List",
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">
        {row.getValue("packingList")}
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
