"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { formatCurrency } from "@/src/utils/formatCurrency";
import type {
  MockCuentaContable,
  CuentaTipo,
} from "../interfaces/accounting-entry.interface";

const TIPO_CFG: Record<CuentaTipo, { label: string; cls: string; dot: string }> = {
  activo: { label: "Activo", cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400", dot: "bg-sky-400" },
  pasivo: { label: "Pasivo", cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400", dot: "bg-amber-400" },
  capital: { label: "Capital", cls: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400", dot: "bg-violet-500" },
  ingreso: { label: "Ingreso", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400", dot: "bg-emerald-500" },
  egreso: { label: "Egreso", cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400", dot: "bg-red-500" },
  costo: { label: "Costo", cls: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400", dot: "bg-orange-500" },
};

const NIVEL_LABEL: Record<number, string> = { 1: "Mayor", 2: "Subcuenta", 3: "Auxiliar" };

const columnHelper = createColumnHelper<MockCuentaContable>();

export const cuentasContablesColumns = [
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
  columnHelper.accessor("tipo", {
    header: "Tipo",
    cell: (info) => {
      const cfg = TIPO_CFG[info.getValue()];
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cfg.cls}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} aria-hidden="true" />
          {cfg.label}
        </span>
      );
    },
  }),
  columnHelper.accessor("naturaleza", {
    header: "Naturaleza",
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300 capitalize">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("nivel", {
    header: "Nivel",
    cell: (info) => {
      const nivel = info.getValue();
      return (
        <span className="text-slate-600 dark:text-slate-300 tabular-nums">
          {nivel}
          <span className="text-slate-400 dark:text-slate-500"> · {NIVEL_LABEL[nivel] ?? "—"}</span>
        </span>
      );
    },
  }),
  columnHelper.accessor("saldo", {
    header: "Saldo",
    cell: (info) => {
      const saldo = info.getValue();
      return (
        <span
          className={`font-semibold tabular-nums ${
            saldo < 0
              ? "text-red-600 dark:text-red-400"
              : "text-slate-800 dark:text-white"
          }`}
        >
          {formatCurrency(saldo)}
        </span>
      );
    },
  }),
  columnHelper.accessor("activa", {
    header: "Estatus",
    cell: (info) =>
      info.getValue() ? (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-500" aria-hidden="true" />
          Activa
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-slate-400" aria-hidden="true" />
          Inactiva
        </span>
      ),
  }),
] as ColumnDef<MockCuentaContable>[];
