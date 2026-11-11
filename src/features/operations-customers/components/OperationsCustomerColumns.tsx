"use client";

import { ColumnDef, FilterFn } from "@tanstack/react-table";
import {
  ColumnHeaderFilter,
  FilterHeader,
  type ColumnFilterOption,
} from "@/src/components/ColumnHeaderFilter";
import {
  ALL_FILTER_OPTION,
  buildDistinctFilterOptions,
  buildMonthFilterOptions,
  matchesMonthFilter,
} from "@/src/utils/columnFilterOptions";
import {
  formatUltimaCompra,
  SIN_COMPRAS_LABEL,
} from "@/src/features/customers/utils/ultimaCompra";
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
// Debajo de la razón social, el estatus EN PALABRA (badge discreto, como
// Compras): el color solo no se entiende sin saber el código.
const RazonSocialCell = ({ customer }: { customer: OperationsCustomer }) => (
  <div className="flex items-center gap-2">
    <span
      className={`h-2.5 w-2.5 rounded-full shrink-0 ${customer.activo ? "bg-emerald-500" : "bg-slate-400"}`}
      aria-hidden="true"
    />
    <div className="flex flex-col items-start gap-1 min-w-0">
      <span className="font-medium text-slate-700 dark:text-slate-200">
        {customer.razon_social || "—"}
      </span>
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none whitespace-nowrap ${
          customer.activo
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
            : "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300"
        }`}
      >
        {customer.activo ? "Activo" : "Inactivo"}
      </span>
    </div>
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

export interface OperationsCustomerFilterOptions {
  estados: ColumnFilterOption[];
  /** Meses con compras y, si algún cliente no tiene, "Sin compras". */
  mesesUltimaCompra: ColumnFilterOption[];
}

export function buildOperationsCustomerFilterOptions(
  customers: OperationsCustomer[],
): OperationsCustomerFilterOptions {
  return {
    estados: [ALL_FILTER_OPTION, ...buildDistinctFilterOptions(customers, (c) => c.estado)],
    mesesUltimaCompra: [
      ALL_FILTER_OPTION,
      ...buildMonthFilterOptions(
        customers.map((c) => c.fecha_ultima_compra),
        SIN_COMPRAS_LABEL,
      ),
    ],
  };
}

// ── Columnas ──────────────────────────────────────────────────────────────────

export const getOperationsCustomerColumns = (
  filterOptions: OperationsCustomerFilterOptions = {
    estados: [ALL_FILTER_OPTION],
    mesesUltimaCompra: [ALL_FILTER_OPTION],
  },
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
    // Fecha de la última compra (`fecha_ultima_compra`). `null` = sin compras:
    // la celda muestra `SIN_COMPRAS_LABEL`, el mismo texto que la opción del
    // filtro para esas filas; al ordenar, van al final.
    id: "ultima_compra",
    accessorFn: (row) => row.fecha_ultima_compra || undefined,
    header: ({ column }) => (
      <FilterHeader
        title="Última Compra"
        column={column}
        options={filterOptions.mesesUltimaCompra}
        label="mes de última compra"
        menuAlign="end"
      />
    ),
    filterFn: (row, _columnId, filterValue) =>
      matchesMonthFilter(row.original.fecha_ultima_compra, filterValue),
    meta: { label: "Última Compra" },
    sortUndefined: "last",
    enableGlobalFilter: false,
    cell: ({ row }) =>
      row.original.fecha_ultima_compra === null ? (
        <span className="text-slate-400 dark:text-slate-600 whitespace-nowrap">
          {formatUltimaCompra(row.original.fecha_ultima_compra)}
        </span>
      ) : (
        <span className="text-slate-600 dark:text-slate-300 whitespace-nowrap">
          {formatUltimaCompra(row.original.fecha_ultima_compra)}
        </span>
      ),
  },
];
