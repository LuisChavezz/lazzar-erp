"use client";

import { ColumnDef } from "@tanstack/react-table";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { AccountingCustomer } from "../interfaces/accounting-customer.interface";

// ── Columnas ──────────────────────────────────────────────────────────────────

/**
 * Listado de solo lectura: el nombre lleva el punto de `activo` igual que los
 * demás catálogos, pero sin menú — no hay acciones ni detalle, así que
 * `FolioActionMenu` lo pinta como texto plano.
 */
export const accountingCustomerColumns: ColumnDef<AccountingCustomer>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
    size: 240,
    cell: ({ row }) => (
      <FolioActionMenu name={row.original.nombre} items={[]} active={row.original.activo} />
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
];

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 * El nombre filtra por `activo` (su punto), con ficha "Estatus: …". `estado`
 * es el estado GEOGRÁFICO de la dirección, no un estatus: no lleva filtro.
 *
 * Hoy el backend de `clientes-contabilidad` solo devuelve clientes activos
 * (ignora `?activo=false`), así que "Inactivo" no encuentra filas; el filtro se
 * conserva para cuando el listado los incluya.
 */
export const ACCOUNTING_CUSTOMER_HEADER_FILTERS: Partial<
  Record<string, HeaderFilterSpec<AccountingCustomer>>
> = {
  nombre: { type: "boolean", filterLabel: "estatus", get: (r) => r.activo, yes: "Activo", no: "Inactivo" },
};
