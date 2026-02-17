"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Invoice } from "../interfaces/invoice.interface";
import { EditIcon, ViewIcon } from "../../../components/Icons";

const StatusBadge = ({ status }: { status: Invoice["status"] }) => {
  const styles = {
    Pagada: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    Pendiente: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    Vencida: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    Cancelada: "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
};

export const invoiceColumns: ColumnDef<Invoice>[] = [
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
    header: "Cliente",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-slate-700 dark:text-slate-200 font-medium">
          {row.getValue("client")}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {row.original.rfc}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "date",
    header: "Fecha Emisión",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("date")}
      </span>
    ),
  },
  {
    accessorKey: "dueDate",
    header: "Vencimiento",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("dueDate")}
      </span>
    ),
  },
  {
    accessorKey: "amount",
    header: "Monto",
    cell: ({ row }) => (
      <div className="text-right font-semibold text-slate-700 dark:text-slate-200">
        {row.original.amount.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}
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
