"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { formatCurrency } from "@/src/utils/formatCurrency";
import type { MockCentroCosto } from "../interfaces/accounting-entry.interface";

const columnHelper = createColumnHelper<MockCentroCosto>();

export const centrosCostoColumns = [
  columnHelper.accessor("codigo", {
    header: "Código",
    cell: (info) => (
      <span className="font-mono text-slate-700 dark:text-slate-200 font-semibold">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("nombre", {
    header: "Nombre",
    cell: (info) => (
      <span className="text-slate-700 dark:text-slate-200">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("area", {
    header: "Área",
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("presupuesto", {
    header: "Presupuesto",
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300 tabular-nums">
        {formatCurrency(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("gasto_real", {
    header: "Gasto real",
    cell: (info) => (
      <span className="text-slate-800 dark:text-white font-semibold tabular-nums">
        {formatCurrency(info.getValue())}
      </span>
    ),
  }),
  columnHelper.display({
    id: "variacion",
    header: "Variación",
    cell: ({ row }) => {
      const variacion = row.original.gasto_real - row.original.presupuesto;
      const overBudget = variacion > 0;
      return (
        <span
          className={`font-semibold tabular-nums ${
            overBudget
              ? "text-red-600 dark:text-red-400"
              : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {overBudget ? "+" : ""}
          {formatCurrency(variacion)}
        </span>
      );
    },
  }),
  columnHelper.display({
    id: "ejercido",
    header: "% Ejercido",
    cell: ({ row }) => {
      const { presupuesto, gasto_real } = row.original;
      const pct = presupuesto > 0 ? Math.round((gasto_real / presupuesto) * 100) : 0;
      const overBudget = pct > 100;
      return (
        <div className="flex items-center gap-2 min-w-32">
          <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full ${overBudget ? "bg-red-500" : "bg-emerald-500"}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <span
            className={`text-xs font-semibold tabular-nums w-10 text-right ${
              overBudget
                ? "text-red-600 dark:text-red-400"
                : "text-slate-600 dark:text-slate-300"
            }`}
          >
            {pct}%
          </span>
        </div>
      );
    },
  }),
] as ColumnDef<MockCentroCosto>[];
