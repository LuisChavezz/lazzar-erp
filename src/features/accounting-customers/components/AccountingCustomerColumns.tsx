"use client";

import { ColumnDef, FilterFn } from "@tanstack/react-table";
import { ACTIVO_INACTIVO_CFG } from "@/src/components/StatusBadge";
import { ColumnHeaderFilter, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { AccountingCustomer } from "../interfaces/accounting-customer.interface";

const ACTIVO_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: "Todos" },
  { value: "true", label: "Activo", dotClassName: ACTIVO_INACTIVO_CFG.activo.dot },
  { value: "false", label: "Inactivo", dotClassName: ACTIVO_INACTIVO_CFG.inactivo.dot },
];

const activoFilterFn: FilterFn<AccountingCustomer> = (row, _columnId, filterValue) => {
  if (filterValue === undefined) return true;
  return String(row.original.activo) === filterValue;
};

// ── Columnas ──────────────────────────────────────────────────────────────────

export const accountingCustomerColumns: ColumnDef<AccountingCustomer>[] = [
  {
    accessorKey: "nombre",
    header: ({ column }) => (
      <div className="flex items-center gap-1.5">
        <span>Nombre</span>
        <ColumnHeaderFilter column={column} options={ACTIVO_FILTER_OPTIONS} label="estatus" />
      </div>
    ),
    filterFn: activoFilterFn,
    cell: ({ row }) => {
      const statusCfg = row.original.activo ? ACTIVO_INACTIVO_CFG.activo : ACTIVO_INACTIVO_CFG.inactivo;
      return (
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusCfg.dot}`} title={statusCfg.label} aria-hidden="true" />
          <span className="font-medium text-[11px] text-slate-700 dark:text-slate-200">
            {row.getValue("nombre") || "—"}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "razon_social",
    header: "Razón Social",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("razon_social") || "—"}
      </span>
    ),
  },
  {
    accessorKey: "rfc",
    header: "RFC",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
        {row.getValue("rfc") || "—"}
      </span>
    ),
  },
  {
    accessorKey: "correo",
    header: "Correo",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("correo") || "—"}
      </span>
    ),
  },
  {
    id: "telefono",
    header: "Teléfono",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300 tabular-nums">
        {row.original.telefono || row.original.celular || "—"}
      </span>
    ),
  },
  {
    id: "ubicacion",
    header: "Ubicación",
    cell: ({ row }) => {
      const { ciudad, estado } = row.original;
      const ubicacion = [ciudad, estado].filter(Boolean).join(", ");
      return (
        <span className="text-slate-600 dark:text-slate-300">{ubicacion || "—"}</span>
      );
    },
  },
];
