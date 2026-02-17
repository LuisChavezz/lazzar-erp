"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Receipt } from "../interfaces/receipt.interface";
import { EditIcon, ViewIcon } from "../../../components/Icons";

const StatusBadge = ({ status }: { status: Receipt["status"] }) => {
  const styles = {
    "Recibiendo": "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    "Pendiente": "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    "Incidencia": "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    "Completado": "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  };
  
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
};

export const receptionsColumns: ColumnDef<Receipt>[] = [
  {
    accessorKey: "id",
    header: "Folio",
    cell: ({ row }) => (
      <span className="font-medium text-slate-700 dark:text-slate-200">
        {row.getValue("id")}
      </span>
    ),
  },
  {
    accessorKey: "provider",
    header: "Proveedor",
    cell: ({ row }) => (
      <span className="text-slate-700 dark:text-slate-200 font-medium">
        {row.getValue("provider")}
      </span>
    ),
  },
  {
    accessorKey: "reference",
    header: "Referencia",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("reference")}
      </span>
    ),
  },
  {
    accessorKey: "date",
    header: "Fecha",
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">
        {row.getValue("date")}
      </span>
    ),
  },
  {
    accessorKey: "warehouse",
    header: "Almacén",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("warehouse")}
      </span>
    ),
  },
  {
    accessorKey: "items",
    header: "Items",
    cell: ({ row }) => (
      <div className="text-center text-slate-500 dark:text-slate-400">
        {row.original.items.toLocaleString("es-MX")}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
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
