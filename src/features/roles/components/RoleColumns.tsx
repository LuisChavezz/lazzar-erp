"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Role } from "../interfaces/role.interface";

export const roleColumns: ColumnDef<Role>[] = [
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
      <div className="flex flex-col">
        <span className="font-medium text-slate-900 dark:text-white">
          {row.getValue("nombre")}
        </span>
        {row.original.descripcion && (
          <span className="text-xs text-slate-500 truncate max-w-[300px]">
            {row.original.descripcion}
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "clave_departamento",
    header: "Departamento",
    cell: ({ row }) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {row.getValue("clave_departamento") || "-"}
      </span>
    ),
  },
  {
    accessorKey: "permisos_count",
    header: "Permisos",
    cell: ({ row }) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
        {row.getValue("permisos_count")} permisos
      </span>
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
