"use client";

import { ColumnDef } from "@tanstack/react-table";
import { StatusBadge, type StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import { AccountingCustomer } from "../interfaces/accounting-customer.interface";

// ── Badge de estatus ──────────────────────────────────────────────────────────

const ESTATUS_CFG: Record<string, StatusBadgeConfigEntry> = {
  activo: {
    label: "Activo",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  inactivo: {
    label: "Inactivo",
    cls: "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    dot: "bg-slate-400",
  },
};

// ── Columnas ──────────────────────────────────────────────────────────────────

export const accountingCustomerColumns: ColumnDef<AccountingCustomer>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => (
      <span className="font-medium text-slate-700 dark:text-slate-200">
        {row.getValue("nombre") || "—"}
      </span>
    ),
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
  {
    accessorKey: "activo",
    header: "Estatus",
    cell: ({ row }) => (
      <StatusBadge status={row.getValue("activo") ? "activo" : "inactivo"} config={ESTATUS_CFG} />
    ),
  },
];
