"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ProductionOrder } from "../interfaces/production.interface";
import { EditIcon, ViewIcon } from "../../../components/Icons";

const StatusBadge = ({ status }: { status: ProductionOrder["estatusOp"] }) => {
  const styles = {
    "En Proceso": "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
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

export const productionColumns: ColumnDef<ProductionOrder>[] = [
  {
    accessorKey: "estatusOp",
    header: "Estatus OP",
    cell: ({ row }) => <StatusBadge status={row.getValue("estatusOp")} />,
  },
  {
    accessorKey: "pedido",
    header: "Pedido",
    cell: ({ row }) => (
      <span className="text-slate-700 dark:text-slate-200 font-medium">
        {row.getValue("pedido")}
      </span>
    ),
  },
  {
    accessorKey: "fechaIngreso",
    header: "Fecha Ingreso",
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">
        {row.getValue("fechaIngreso")}
      </span>
    ),
  },
  {
    accessorKey: "fechaEntrega",
    header: "Fecha Entrega",
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">
        {row.getValue("fechaEntrega")}
      </span>
    ),
  },
  {
    accessorKey: "op",
    header: "O.P.",
    cell: ({ row }) => (
      <span className="font-medium text-slate-700 dark:text-slate-200">
        {row.getValue("op")}
      </span>
    ),
  },
  {
    accessorKey: "fechaOp",
    header: "Fecha O.P.",
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">
        {row.getValue("fechaOp")}
      </span>
    ),
  },
  {
    accessorKey: "modelo",
    header: "Modelo",
    cell: ({ row }) => (
      <span className="text-slate-700 dark:text-slate-200">
        {row.getValue("modelo")}
      </span>
    ),
  },
  {
    accessorKey: "producto",
    header: "Producto",
    cell: ({ row }) => (
      <span className="text-slate-700 dark:text-slate-200 font-medium">
        {row.getValue("producto")}
      </span>
    ),
  },
  {
    accessorKey: "color",
    header: "Color",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("color")}
      </span>
    ),
  },
  {
    accessorKey: "categoria",
    header: "Categoría",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("categoria")}
      </span>
    ),
  },
  {
    accessorKey: "cantidad",
    header: "Cantidad",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.original.cantidad.toLocaleString("es-MX")}
      </span>
    ),
  },
  {
    accessorKey: "centroConfeccion",
    header: "Centro de confección",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("centroConfeccion")}
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
