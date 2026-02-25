"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ProductionOrderItem } from "../interfaces/production-order.interface";
import { EditIcon, ViewIcon } from "../../../components/Icons";

const ProductionStatusBadge = ({
  status,
}: {
  status: ProductionOrderItem["estatus"];
}) => {
  const styles: Record<ProductionOrderItem["estatus"], string> = {
    Pendiente: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    "En proceso": "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
    "En revisión": "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    Completado: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
};

export const productionOrderColumns: ColumnDef<ProductionOrderItem>[] = [
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
    accessorKey: "cliente",
    header: "Cliente",
    cell: ({ row }) => (
      <span className="text-slate-700 dark:text-slate-200">
        {row.getValue("cliente")}
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
    accessorKey: "estatus",
    header: "Estatus",
    cell: ({ row }) => <ProductionStatusBadge status={row.getValue("estatus")} />,
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
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => (
      <div className="text-right font-semibold text-slate-700 dark:text-slate-200">
        {row.original.total.toLocaleString("es-MX", {
          style: "currency",
          currency: "MXN",
        })}
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
