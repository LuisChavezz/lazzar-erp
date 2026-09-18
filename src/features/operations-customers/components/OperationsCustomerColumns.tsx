"use client";

import { ColumnDef, FilterFn } from "@tanstack/react-table";
import { ACTIVO_INACTIVO_CFG, StatusBadge } from "@/src/components/StatusBadge";
import { ColumnHeaderFilter, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { OperationsCustomer } from "../interfaces/operations-customer.interface";

/**
 * Filtro de estatus. Mismo patrón que `BankList`/Clientes de Ventas: `DataTable`
 * filtra en memoria comparando `String(row[configId]) === value`, así que los
 * valores son los del booleano `activo` serializado ("true"/"false").
 */
const ESTATUS_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: "Todos" },
  { value: "true", label: "Activo", dotClassName: "bg-emerald-500" },
  { value: "false", label: "Inactivo", dotClassName: "bg-slate-400" },
];

const estatusFilterFn: FilterFn<OperationsCustomer> = (row, _columnId, filterValue) => {
  if (filterValue === undefined) return true;
  return String(row.original.activo) === filterValue;
};

// ── Columnas ──────────────────────────────────────────────────────────────────

export const operationsCustomerColumns: ColumnDef<OperationsCustomer>[] = [
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
    id: "telefono",
    header: "Teléfono",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300 tabular-nums">
        {row.original.telefono || row.original.celular || "—"}
      </span>
    ),
  },
  // `accessorFn` que colapsa `null` a `""` — mismo bug de
  // `getColumnCanGlobalFilter`/`flatRows[0]` que ya documenta
  // `CorteMangaOrderColumns.tsx`. `id` explícito conserva la
  // visibilidad/orden de columna que guarda `DataTable`; `contacto` es propio
  // de este recurso y nullable (ver `OperationsCustomer`).
  {
    id: "contacto",
    accessorFn: (row) => row.contacto ?? "",
    header: "Contacto",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("contacto") || "—"}
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
    filterFn: estatusFilterFn,
    header: ({ column }) => (
      <div className="flex items-center gap-1.5">
        <span>Estatus</span>
        <ColumnHeaderFilter column={column} options={ESTATUS_FILTER_OPTIONS} label="estatus" />
      </div>
    ),
    cell: ({ row }) => (
      <StatusBadge status={row.getValue("activo") ? "activo" : "inactivo"} config={ACTIVO_INACTIVO_CFG} />
    ),
  },
];
