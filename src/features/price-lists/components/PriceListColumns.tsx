"use client";

import { ColumnDef } from "@tanstack/react-table";
import { PriceListItem } from "../interfaces/price-list.interface";
import { EditIcon, ViewIcon } from "../../../components/Icons";

const PriceListStatusBadge = ({ status }: { status: PriceListItem["status"] }) => {
  const styles: Record<PriceListItem["status"], string> = {
    Activa: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    Borrador: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    Archivada: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
};

export const priceListColumns: ColumnDef<PriceListItem>[] = [
  {
    accessorKey: "code",
    header: "Código",
    cell: ({ row }) => (
      <span className="font-medium text-slate-700 dark:text-slate-200">
        {row.getValue("code")}
      </span>
    ),
  },
  {
    accessorKey: "name",
    header: "Lista",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-slate-700 dark:text-slate-200 font-medium">
          {row.getValue("name")}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {row.original.currency}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "itemsCount",
    header: "Ítems",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.original.itemsCount.toLocaleString("es-MX")}
      </span>
    ),
  },
  {
    accessorKey: "margin",
    header: "Margen",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.original.margin.toFixed(1)}%
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => <PriceListStatusBadge status={row.getValue("status")} />,
  },
  {
    accessorKey: "lastUpdate",
    header: "Última actualización",
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">
        {row.getValue("lastUpdate")}
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
