"use client";

import { ColumnDef, FilterFn } from "@tanstack/react-table";
import { ColumnHeaderFilter, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { OperationsCustomer } from "../interfaces/operations-customer.interface";

/**
 * Filtro de estatus. Mismo patrón que `CustomerColumns.tsx` (Ventas): `DataTable`
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

// Sin columna aparte de "Estatus": el punto de color cuelga de la propia
// Razón Social, igual que `CustomerColumns.tsx` (Ventas) — a diferencia de
// aquella, esta tabla es de solo lectura (sin `ActionMenu` por renglón), así
// que no lleva trigger ni chevron, solo el punto junto al texto.
// `justify-center`: la celda es un contenedor flex, así que el `text-center`
// que `DataTable` pone en el `<td>` (modo panel) no la centra por sí solo.
// El resto de columnas no lleva clase de alineación.
const RazonSocialCell = ({ customer }: { customer: OperationsCustomer }) => (
  <div className="flex items-center justify-center gap-2">
    <span
      className={`h-2.5 w-2.5 rounded-full shrink-0 ${customer.activo ? "bg-emerald-500" : "bg-slate-400"}`}
      role="img"
      aria-label={customer.activo ? "Activo" : "Inactivo"}
      title={customer.activo ? "Activo" : "Inactivo"}
    />
    <span className="font-medium text-slate-700 dark:text-slate-200">
      {customer.razon_social || "—"}
    </span>
  </div>
);

// ── Columnas ──────────────────────────────────────────────────────────────────

export const operationsCustomerColumns: ColumnDef<OperationsCustomer>[] = [
  // `nombre` y `rfc` ya no tienen columna propia, pero la búsqueda global de
  // `DataTable` solo ve accessors de columna: se concatenan aquí para que
  // sigan siendo buscables (el placeholder de la lista los promete). La celda
  // pinta desde `row.original`, y el orden sigue encabezado por la razón social.
  {
    id: "razon_social",
    accessorFn: (row) =>
      [row.razon_social, row.nombre, row.rfc].filter(Boolean).join(" "),
    filterFn: estatusFilterFn,
    header: ({ column }) => (
      <div className="flex items-center gap-1.5">
        <span>Razón social</span>
        <ColumnHeaderFilter column={column} options={ESTATUS_FILTER_OPTIONS} label="estatus" />
      </div>
    ),
    cell: ({ row }) => <RazonSocialCell customer={row.original} />,
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
    id: "telefono",
    header: "Teléfono",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300 tabular-nums">
        {row.original.telefono || row.original.celular || "—"}
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
    // PLACEHOLDER a propósito: el endpoint de clientes de Mesa de Control
    // todavía no expone la fecha de última compra. Fija en "—" en todas las
    // filas hasta que el backend la agregue — mismo patrón que
    // `CustomerColumns.tsx` (Ventas).
    id: "ultima_compra",
    header: "Última Compra",
    enableSorting: false,
    cell: () => <span className="text-slate-400 dark:text-slate-600">—</span>,
  },
];
