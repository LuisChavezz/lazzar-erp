import { UNKNOWN_CURRENCY_TAG } from "@/src/components/CurrencyTotalsValue";
import { buildDistinctFilterOptions } from "@/src/utils/columnFilterOptions";

/**
 * Filtro de encabezado por MONEDA de un listado de cotizaciones en memoria
 * (EC-618): una opción por código presente en las filas y, si alguna no tiene
 * moneda, "Sin moneda".
 */

/** Valor del filtro para las cotizaciones sin moneda (`moneda_codigo: null`). */
export const SIN_MONEDA_FILTER_VALUE = "__sin_moneda__";

type WithMoneda = { moneda_codigo: string | null };

/** Opciones del filtro (sin la de "Todos", que agrega quien las pinta). */
export const buildQuoteCurrencyFilterOptions = (
  quotes: readonly WithMoneda[],
): { value: string; label: string }[] => [
  ...buildDistinctFilterOptions([...quotes], (q) => q.moneda_codigo),
  ...(quotes.some((q) => !q.moneda_codigo)
    ? [{ value: SIN_MONEDA_FILTER_VALUE, label: UNKNOWN_CURRENCY_TAG }]
    : []),
];

/** ¿La moneda de la fila coincide con la opción elegida? Sin opción, todas pasan. */
export const matchesQuoteCurrencyFilter = (
  monedaCodigo: string | null,
  filterValue: string | undefined,
): boolean =>
  !filterValue ||
  (filterValue === SIN_MONEDA_FILTER_VALUE ? !monedaCodigo : monedaCodigo === filterValue);
