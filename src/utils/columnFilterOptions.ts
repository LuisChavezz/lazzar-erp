import { format } from "date-fns";
import { es } from "date-fns/locale";
import { parseLocalDate } from "./formatDate";
import type { ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";

/**
 * Opciones y comparadores para los filtros de encabezado (estilo Excel) de
 * columnas de FECHA y de CANTIDAD en tablas en modo cliente, donde la lista
 * completa ya está en memoria y las opciones pueden salir de sus filas.
 *
 * Las fechas se filtran por MES (una opción por cada mes presente en los
 * datos, el más reciente primero) y las cantidades por RANGOS fijos que define
 * cada tabla.
 */

/** Valor de filtro de las filas sin fecha. */
export const NO_DATE_FILTER_VALUE = "__sin_fecha__";

/** Mes de una fecha como `"yyyy-MM"`, o `NO_DATE_FILTER_VALUE` si no hay fecha válida. */
export const monthFilterKey = (value: string | null | undefined): string => {
  const date = parseLocalDate(value);
  return date ? format(date, "yyyy-MM") : NO_DATE_FILTER_VALUE;
};

/**
 * Una opción por mes presente en `values` ("Octubre 2026"), del más reciente
 * al más antiguo. Con `emptyLabel`, y solo si alguna fila no tiene fecha,
 * agrega al final la opción para esas filas.
 */
export function buildMonthFilterOptions(
  values: (string | null | undefined)[],
  emptyLabel?: string,
): { value: string; label: string }[] {
  const keys = new Set(values.map(monthFilterKey));
  const options = [...keys]
    .filter((key) => key !== NO_DATE_FILTER_VALUE)
    .sort()
    .reverse()
    .map((key) => {
      const [year, month] = key.split("-").map(Number);
      const label = format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: es });
      return { value: key, label: label.charAt(0).toUpperCase() + label.slice(1) };
    });
  if (emptyLabel && keys.has(NO_DATE_FILTER_VALUE)) {
    options.push({ value: NO_DATE_FILTER_VALUE, label: emptyLabel });
  }
  return options;
}

/** ¿La fecha `value` cae en el mes elegido (`filterValue`, de `buildMonthFilterOptions`)? */
export const matchesMonthFilter = (
  value: string | null | undefined,
  filterValue: string | undefined,
): boolean => !filterValue || monthFilterKey(value) === filterValue;

/** Rango de un filtro de cantidad: `min` inclusivo, `max` exclusivo; ambos opcionales. */
export interface RangeFilterOption {
  value: string;
  label: string;
  min?: number;
  max?: number;
}

/**
 * ¿La cantidad cae en el rango elegido? Un valor que no es número (p. ej. un
 * importe que el backend no manda por permisos) no cae en ningún rango.
 */
export const matchesRangeFilter = (
  ranges: RangeFilterOption[],
  value: string | number | null | undefined,
  filterValue: string | undefined,
): boolean => {
  if (!filterValue) return true;
  const range = ranges.find((option) => option.value === filterValue);
  if (!range) return true;
  if (value === null || value === undefined || value === "") return false;
  const amount = Number(value);
  if (Number.isNaN(amount)) return false;
  return (range.min === undefined || amount >= range.min) && (range.max === undefined || amount < range.max);
};

/** Opción "Todos" de `ColumnHeaderFilter` (limpia el filtro de la columna). */
export const ALL_FILTER_OPTION = { value: undefined, label: "Todos" } as const;

/**
 * Una opción por cada valor distinto de las filas, ordenadas por etiqueta. El
 * `value` es el campo crudo con el que compara el `filterFn` (un id, de
 * preferencia: dos nombres iguales no se mezclan); filas sin valor o sin
 * etiqueta se omiten.
 */
export function buildDistinctFilterOptions<T>(
  rows: T[],
  getValue: (row: T) => string | number | null | undefined,
  getLabel: (row: T) => string | null | undefined = (row) => {
    const value = getValue(row);
    return value === null || value === undefined ? undefined : String(value);
  },
): { value: string; label: string }[] {
  const options = new Map<string, string>();
  for (const row of rows) {
    const value = getValue(row);
    const label = getLabel(row)?.trim();
    if (value === null || value === undefined || value === "" || !label) continue;
    const key = String(value);
    if (!options.has(key)) options.set(key, label);
  }
  return Array.from(options, ([value, label]) => ({ value, label })).sort((a, b) =>
    a.label.localeCompare(b.label, "es"),
  );
}

/** Entrada de un catálogo de estatus/enum del front, en cualquiera de sus formas con objeto. */
export interface FilterOptionConfigEntry {
  label?: string;
  /** Clase del punto de color (`StatusBadgeConfigEntry.dot`). */
  dot?: string;
}

/**
 * Opciones de filtro a partir de un catálogo del front indexado por el código
 * crudo (`Record<code, { label?, dot? }>`): una por llave, en el orden de las
 * llaves, con su etiqueta (o el código, si no trae) y su punto de color. Los
 * catálogos que ya son arreglos `{ value, label }[]` se pasan tal cual, sin
 * este helper.
 */
export function optionsFromConfig<K extends PropertyKey>(
  config: Record<K, FilterOptionConfigEntry>,
): ColumnFilterOption[] {
  return Object.entries(config as Record<string, FilterOptionConfigEntry>).map(([value, cfg]) => ({
    value,
    label: cfg.label ?? value,
    dotClassName: cfg.dot,
  }));
}

/**
 * Opciones de una columna con catálogo conocido (spec `options` de
 * `withHeaderFilters`): "Todos", luego `options` en su orden y al final, sin
 * repetir, cada valor de las filas que el catálogo no cubre, rotulado con el
 * valor crudo. Así todo valor que puede quedar activo tiene opción y la ficha
 * del filtro siempre tiene etiqueta. Filas sin valor se omiten.
 */
export function buildCatalogFilterOptions<T>(
  rows: T[],
  getValue: (row: T) => string | number | null | undefined,
  options: ColumnFilterOption[],
): ColumnFilterOption[] {
  const known = new Set(options.map((option) => option.value));
  const extra: ColumnFilterOption[] = [];
  for (const row of rows) {
    const value = getValue(row);
    if (value === null || value === undefined || value === "") continue;
    const key = String(value);
    if (known.has(key)) continue;
    known.add(key);
    extra.push({ value: key, label: key });
  }
  return [ALL_FILTER_OPTION, ...options, ...extra];
}
