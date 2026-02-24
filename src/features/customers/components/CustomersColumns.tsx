"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CustomerItem } from "../interfaces/customers.interface";
import { EditIcon, ViewIcon } from "../../../components/Icons";

const CustomerStatusBadge = ({ status }: { status: CustomerItem["status"] }) => {
  const styles: Record<CustomerItem["status"], string> = {
    Activo: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    Prospecto: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
    "En riesgo": "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    Inactivo: "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400",
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
};

export const customersColumns: ColumnDef<CustomerItem>[] = [
  {
    accessorKey: "code",
    header: "Cliente",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium text-slate-700 dark:text-slate-200">
          {row.getValue("code")}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {row.original.name}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "segment",
    header: "Segmento",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("segment")}
      </span>
    ),
  },
  {
    accessorKey: "city",
    header: "Ciudad",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("city")}
      </span>
    ),
  },
  {
    accessorKey: "totalSales",
    header: "Ventas",
    cell: ({ row }) => (
      <span className="font-semibold text-slate-700 dark:text-slate-200">
        {row.getValue("totalSales")}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => <CustomerStatusBadge status={row.getValue("status")} />,
  },
  {
    accessorKey: "lastOrder",
    header: "Última orden",
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">
        {row.getValue("lastOrder")}
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
