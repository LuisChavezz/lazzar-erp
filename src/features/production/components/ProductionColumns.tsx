"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ProductionOrder } from "../interfaces/production.interface";
import { EditIcon, ViewIcon } from "../../../components/Icons";

const StatusBadge = ({ status }: { status: ProductionOrder["status"] }) => {
  const styles = {
    "En Producción": "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    "Planificado": "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    "Control Calidad": "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    "Terminado": "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  };
  
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
};

const ProgressBar = ({ progress }: { progress: number }) => {
  return (
    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
      <div 
        className={`h-1.5 rounded-full ${
          progress === 100 ? "bg-emerald-500" : 
          progress > 50 ? "bg-blue-500" : 
          "bg-amber-500"
        }`} 
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );
};

export const productionColumns: ColumnDef<ProductionOrder>[] = [
  {
    accessorKey: "id",
    header: "Folio OP",
    cell: ({ row }) => (
      <span className="font-medium text-slate-700 dark:text-slate-200">
        {row.getValue("id")}
      </span>
    ),
  },
  {
    accessorKey: "product",
    header: "Producto",
    cell: ({ row }) => (
      <span className="text-slate-700 dark:text-slate-200 font-medium">
        {row.getValue("product")}
      </span>
    ),
  },
  {
    accessorKey: "quantity",
    header: "Cantidad",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.original.quantity.toLocaleString("es-MX")}
      </span>
    ),
  },
  {
    accessorKey: "startDate",
    header: "Inicio",
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">
        {row.getValue("startDate")}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
  },
  {
    accessorKey: "progress",
    header: "Progreso",
    cell: ({ row }) => (
      <div className="w-32">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-500">{row.getValue("progress")}%</span>
        </div>
        <ProgressBar progress={row.getValue("progress")} />
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
