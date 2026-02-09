"use client";

import { ColumnDef } from "@tanstack/react-table";
import { User } from "../interfaces/user.interface";

export const userColumns: ColumnDef<User>[] = [
  {
    accessorKey: "username",
    header: "Usuario",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium text-slate-900 dark:text-white">
          {row.getValue("username")}
        </span>
        <span className="text-xs text-slate-500">
          {row.original.email}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "first_name",
    header: "Nombre Completo",
    cell: ({ row }) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {row.original.first_name} {row.original.last_name}
      </span>
    ),
  },
  {
    accessorKey: "telefono",
    header: "Teléfono",
    cell: ({ row }) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {row.getValue("telefono") || "-"}
      </span>
    ),
  },
  {
    accessorKey: "is_admin_empresa",
    header: "Rol",
    cell: ({ row }) => {
      const isAdmin = row.original.is_admin_empresa;
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            isAdmin
              ? "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400"
              : "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
          }`}
        >
          {isAdmin ? "Admin Empresa" : "Usuario"}
        </span>
      );
    },
  },
  {
    accessorKey: "estatus",
    header: "Estatus",
    cell: ({ row }) => {
      const status = row.getValue("estatus") as string;
      const isActive = row.original.is_active;
      
      const styles =
        isActive && status === "activo"
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
  {
    accessorKey: "date_joined",
    header: "Fecha Registro",
    cell: ({ row }) => {
      const date = new Date(row.getValue("date_joined"));
      return (
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {date.toLocaleDateString()}
        </span>
      );
    },
  },
];
