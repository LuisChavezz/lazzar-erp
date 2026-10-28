"use client";

import { ColumnDef, FilterFn } from "@tanstack/react-table";
import {
  ColumnHeaderFilter,
  FilterHeader,
  type ColumnFilterOption,
} from "@/src/components/ColumnHeaderFilter";
import { ALL_FILTER_OPTION, buildDistinctFilterOptions } from "@/src/utils/columnFilterOptions";
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
const RazonSocialCell = ({ customer }: { customer: OperationsCustomer }) => (
  <div className="flex items-center gap-2">
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

// ── Filtros de encabezado ─────────────────────────────────────────────────────
// Contacto, teléfono y correo se filtran por "con / sin": es lo que se busca
// al depurar el catálogo. La ubicación, por estado (con buscador).

const presenceOptions = (con: string, sin: string): ColumnFilterOption[] => [
  ALL_FILTER_OPTION,
  { value: "con", label: con },
  { value: "sin", label: sin },
];

const presenceFilter =
  (pick: (row: OperationsCustomer) => string | null | undefined) =>
  (row: { original: OperationsCustomer }, _columnId: string, filterValue: string | undefined) =>
    !filterValue || (filterValue === "con") === Boolean(pick(row.original)?.trim());

/** Teléfono visible de la fila: el fijo o, si no hay, el celular. */
export const telefonoDe = (customer: OperationsCustomer) => customer.telefono || customer.celular;

export function buildOperationsCustomerFilterOptions(
  customers: OperationsCustomer[],
): { estados: ColumnFilterOption[] } {
  return {
    estados: [ALL_FILTER_OPTION, ...buildDistinctFilterOptions(customers, (c) => c.estado)],
  };
}

// ── Columnas ──────────────────────────────────────────────────────────────────

export const getOperationsCustomerColumns = (
  filterOptions: { estados: ColumnFilterOption[] } = { estados: [ALL_FILTER_OPTION] },
): ColumnDef<OperationsCustomer>[] => [
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
    size: 280,
    cell: ({ row }) => <RazonSocialCell customer={row.original} />,
  },
  {
    // Ciudad y estado ya llegaban en la respuesta pero no se mostraban.
    id: "ubicacion",
    accessorFn: (row) => [row.ciudad, row.estado].filter(Boolean).join(", "),
    meta: { label: "Ubicación" },
    header: ({ column }) => (
      <FilterHeader
        title="Ubicación"
        column={column}
        options={filterOptions.estados}
        label="estado"
        searchable={{ placeholder: "Buscar estado…" }}
      />
    ),
    filterFn: (row, _columnId, filterValue) =>
      !filterValue || row.original.estado === filterValue,
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {[row.original.ciudad, row.original.estado].filter(Boolean).join(", ") || "—"}
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
    meta: { label: "Contacto" },
    header: ({ column }) => (
      <FilterHeader
        title="Contacto"
        column={column}
        options={presenceOptions("Con contacto", "Sin contacto")}
        label="contacto"
      />
    ),
    filterFn: presenceFilter((c) => c.contacto),
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("contacto") || "—"}
      </span>
    ),
  },
  {
    id: "telefono",
    accessorFn: (row) => telefonoDe(row) ?? "",
    meta: { label: "Teléfono" },
    header: ({ column }) => (
      <FilterHeader
        title="Teléfono"
        column={column}
        options={presenceOptions("Con teléfono", "Sin teléfono")}
        label="teléfono"
      />
    ),
    filterFn: presenceFilter(telefonoDe),
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300 tabular-nums">
        {telefonoDe(row.original) || "—"}
      </span>
    ),
  },
  {
    accessorKey: "correo",
    meta: { label: "Correo" },
    size: 240,
    header: ({ column }) => (
      <FilterHeader
        title="Correo"
        column={column}
        options={presenceOptions("Con correo", "Sin correo")}
        label="correo"
        menuAlign="end"
      />
    ),
    filterFn: presenceFilter((c) => c.correo),
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
