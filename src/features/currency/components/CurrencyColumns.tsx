"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Currency } from "../interfaces/currency.interface";

export const currencyColumns: ColumnDef<Currency>[] = [
  {
    accessorKey: "codigo_iso",
    header: "Código ISO",
    cell: ({ row }) => (
      <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
        {row.getValue("codigo_iso")}
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
    accessorKey: "simbolo",
    header: "Símbolo",
    cell: ({ row }) => (
      <span className="font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-sm">
        {row.getValue("simbolo")}
      </span>
    ),
  },
  {
    accessorKey: "estatus",
    header: "Estatus",
    cell: ({ row }) => {
      const status = row.getValue("estatus") as boolean;
      const styles = status
        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
        : "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400";
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles}`}
        >
          {status ? "Activo" : "Inactivo"}
        </span>
      );
    },
  },
];
