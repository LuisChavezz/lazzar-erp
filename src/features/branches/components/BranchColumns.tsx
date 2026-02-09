"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Branch } from "../interfaces/branch.interface";

export const branchColumns: ColumnDef<Branch>[] = [
  {
    accessorKey: "codigo",
    header: "Código",
    cell: ({ row }) => (
      <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
        {row.getValue("codigo")}
      </span>
    ),
  },
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => (
      <span className="font-medium text-slate-900 dark:text-white">
        {row.getValue("nombre")}
      </span>
    ),
  },
  {
    accessorKey: "ciudad",
    header: "Ubicación",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-slate-900 dark:text-white">
          {row.getValue("ciudad") || "-"}
        </span>
        <span className="text-xs text-slate-500">
          {row.original.estado}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "telefono",
    header: "Contacto",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {row.original.email}
        </span>
        {row.original.telefono && (
          <span className="text-xs text-slate-500">
            {row.original.telefono}
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "estatus",
    header: "Estatus",
    cell: ({ row }) => {
      const status = row.getValue("estatus") as string;
      const styles =
        status === "activo"
          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
          : "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400";
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles}`}
        >
          {status}
        </span>
      );
    },
  },
];
