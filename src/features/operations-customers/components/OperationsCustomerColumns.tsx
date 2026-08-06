"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ACTIVO_INACTIVO_CFG, StatusBadge } from "@/src/components/StatusBadge";
import { OperationsCustomer } from "../interfaces/operations-customer.interface";

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
    header: "Estatus",
    cell: ({ row }) => (
      <StatusBadge status={row.getValue("activo") ? "activo" : "inactivo"} config={ACTIVO_INACTIVO_CFG} />
    ),
  },
];
