"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import type { MockPago } from "../interfaces/accounts-payable.interface";

const METODO_CFG: Record<string, string> = {
  "Transferencia SPEI": "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
  Cheque: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
  Efectivo: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  "Tarjeta empresarial": "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
};

const columnHelper = createColumnHelper<MockPago>();

export const pagosColumns = [
  columnHelper.accessor("folio", {
    header: "Folio pago",
    cell: (info) => (
      <span className="font-mono text-slate-700 dark:text-slate-200 font-semibold">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("proveedor_nombre", {
    header: "Proveedor",
    cell: (info) => (
      <span className="text-slate-700 dark:text-slate-200">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("fecha_pago", {
    header: "Fecha pago",
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300 tabular-nums">
        {formatShortDate(info.getValue(), { timeZone: "UTC" })}
      </span>
    ),
  }),
  columnHelper.accessor("monto", {
    header: "Monto pagado",
    cell: (info) => (
      <span className="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
        {formatCurrency(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("metodo_pago", {
    header: "Método de pago",
    cell: (info) => {
      const cls =
        METODO_CFG[info.getValue()] ??
        "bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300";
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cls}`}
        >
          {info.getValue()}
        </span>
      );
    },
  }),
  columnHelper.accessor("cuenta_bancaria", {
    header: "Cuenta bancaria",
    cell: (info) => (
      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("cxp_folio", {
    header: "CxP aplicada",
    cell: (info) => (
      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
        {info.getValue()}
      </span>
    ),
  }),
] as ColumnDef<MockPago>[];
