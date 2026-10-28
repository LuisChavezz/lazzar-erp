"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { FilterHeader, type ColumnFilterOption } from "./ColumnHeaderFilter";
import {
  ALL_FILTER_OPTION,
  buildDistinctFilterOptions,
  buildMonthFilterOptions,
  matchesMonthFilter,
  matchesRangeFilter,
  type RangeFilterOption,
} from "@/src/utils/columnFilterOptions";

/**
 * Cómo se filtra una columna desde su encabezado (estilo Excel). Cada `get`
 * lee el dato CRUDO de la fila (un id, una fecha ISO, un número), no lo que
 * pinta la celda.
 */
export type HeaderFilterSpec<T> =
  /** Un valor por opción, tomado de las filas (estatus, cliente, operador…). */
  | {
      type: "distinct";
      get: (row: T) => string | number | null | undefined;
      /** Etiqueta visible de cada valor; por defecto, el valor mismo. */
      label?: (row: T) => string | null | undefined;
      /** Con buscador, para catálogos largos. */
      searchable?: boolean;
    }
  /** Un mes por opción, del más reciente al más antiguo. */
  | { type: "month"; get: (row: T) => string | null | undefined; emptyLabel?: string }
  /** Rangos fijos de cantidad o importe. */
  | { type: "range"; get: (row: T) => number | string | null | undefined; ranges: RangeFilterOption[] }
  /** "Con / sin": hay dato (texto no vacío, número > 0) o no. */
  | { type: "presence"; get: (row: T) => unknown; con: string; sin: string }
  /** Un booleano, con su etiqueta para cada lado. */
  | { type: "boolean"; get: (row: T) => boolean | null | undefined; yes: string; no: string };

const hasValue = (value: unknown) =>
  typeof value === "number" ? value > 0 : typeof value === "string" ? value.trim() !== "" : Boolean(value);

function buildOptions<T>(spec: HeaderFilterSpec<T>, rows: T[]): ColumnFilterOption[] {
  switch (spec.type) {
    case "distinct":
      return [ALL_FILTER_OPTION, ...buildDistinctFilterOptions(rows, spec.get, spec.label)];
    case "month":
      return [ALL_FILTER_OPTION, ...buildMonthFilterOptions(rows.map(spec.get), spec.emptyLabel)];
    case "range":
      return [ALL_FILTER_OPTION, ...spec.ranges.map(({ value, label }) => ({ value, label }))];
    case "presence":
      return [ALL_FILTER_OPTION, { value: "con", label: spec.con }, { value: "sin", label: spec.sin }];
    case "boolean":
      return [ALL_FILTER_OPTION, { value: "si", label: spec.yes }, { value: "no", label: spec.no }];
  }
}

function matches<T>(spec: HeaderFilterSpec<T>, row: T, filterValue: string | undefined): boolean {
  if (!filterValue) return true;
  switch (spec.type) {
    case "distinct":
      return String(spec.get(row) ?? "") === filterValue;
    case "month":
      return matchesMonthFilter(spec.get(row), filterValue);
    case "range":
      return matchesRangeFilter(spec.ranges, spec.get(row), filterValue);
    case "presence":
      return (filterValue === "con") === hasValue(spec.get(row));
    case "boolean":
      return (filterValue === "si") === Boolean(spec.get(row));
  }
}

/** Id con el que TanStack identificará la columna (`id` o, si no, `accessorKey`). */
const columnKey = <T,>(column: ColumnDef<T, unknown>): string | undefined =>
  column.id ?? (column as { accessorKey?: string }).accessorKey;

/**
 * Agrega un filtro de encabezado a las columnas de una tabla en modo cliente:
 * a cada columna nombrada en `specs` (por su `id` o `accessorKey`) le pone
 * título + embudo (`FilterHeader`), su `filterFn` y `meta.label`. Las opciones
 * se construyen con `rows` —la lista completa, que en modo cliente ya está en
 * memoria—. Las columnas que no aparecen en `specs` no cambian.
 *
 * El título es el `header` string de la columna o, si es un componente, su
 * `meta.label`. Una columna alineada a la derecha abre su menú hacia la
 * izquierda para no salirse del marco de la tabla.
 */
export function withHeaderFilters<T>(
  columns: ColumnDef<T, unknown>[],
  rows: T[],
  specs: Partial<Record<string, HeaderFilterSpec<T>>>,
): ColumnDef<T, unknown>[] {
  return columns.map((column) => {
    const key = columnKey(column);
    const spec = key ? specs[key] : undefined;
    if (!spec) return column;
    const title =
      typeof column.header === "string" ? column.header : (column.meta?.label ?? key ?? "");
    const options = buildOptions(spec, rows);
    return {
      ...column,
      meta: { ...column.meta, label: column.meta?.label ?? title },
      header: ({ column: tableColumn }) => (
        <FilterHeader
          title={title}
          column={tableColumn}
          options={options}
          label={title.toLowerCase()}
          searchable={spec.type === "distinct" && spec.searchable ? { placeholder: `Buscar ${title.toLowerCase()}…` } : false}
          menuAlign={column.meta?.align === "right" ? "end" : "start"}
        />
      ),
      filterFn: (row, _columnId, filterValue) =>
        matches(spec, row.original, filterValue as string | undefined),
    } as ColumnDef<T, unknown>;
  });
}
