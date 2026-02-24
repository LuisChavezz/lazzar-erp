"use client";

import { ColumnDef } from "@tanstack/react-table";
import { StockItem } from "../stock.interface";
import { EditIcon, ViewIcon } from "../../../components/Icons";

const StockStatusBadge = ({ status }: { status: StockItem["status"] }) => {
  const styles = {
    Saludable: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    Riesgo: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    Crítico: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    Sobrestock: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
};

export const stockColumns: ColumnDef<StockItem>[] = [
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => (
      <span className="font-medium text-slate-700 dark:text-slate-200">
        {row.getValue("sku")}
      </span>
    ),
  },
  {
    accessorKey: "product",
    header: "Producto",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-slate-700 dark:text-slate-200 font-medium">
          {row.getValue("product")}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {row.original.warehouse}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "available",
    header: "Disponible",
    cell: ({ row }) => (
      <div className="font-semibold text-slate-700 dark:text-slate-200">
        {row.original.available.toLocaleString("es-MX")}
      </div>
    ),
  },
  {
    accessorKey: "reserved",
    header: "Reservado",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.original.reserved.toLocaleString("es-MX")}
      </span>
    ),
  },
  {
    accessorKey: "incoming",
    header: "En tránsito",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.original.incoming.toLocaleString("es-MX")}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => <StockStatusBadge status={row.getValue("status")} />,
  },
  {
    accessorKey: "lastMovement",
    header: "Último movimiento",
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">
        {row.getValue("lastMovement")}
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
