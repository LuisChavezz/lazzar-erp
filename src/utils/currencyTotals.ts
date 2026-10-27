/**
 * Totales POR MONEDA (EC-601): importes de monedas distintas nunca se suman en
 * una sola cifra. Se acumula en centavos enteros (los importes del backend
 * llegan con 2 decimales) para que la suma de muchos renglones no arrastre el
 * error de punto flotante.
 *
 * `moneda` es el código ISO ("MXN", "USD") o `null` cuando la moneda no se
 * conoce: ese importe se pinta sin símbolo (regla de EC-600), nunca como pesos.
 *
 * Orden: por código, igual que los `por_moneda[]` que el backend ordena por
 * `codigo_iso` en las secciones de indicadores; la moneda desconocida va al
 * final. `sumMontosPorMoneda` (proveedores) conserva su propio orden de
 * aparición y no usa este helper.
 */

import { formatCurrency, moneyFormatFor } from "@/src/utils/formatCurrency";

export interface CurrencyTotal {
  moneda: string | null;
  total: number;
  /**
   * Etiqueta propia de un total sin moneda conocida, para distinguir dos
   * monedas desconocidas distintas (p. ej. dos PK que el catálogo no trae).
   */
  etiqueta?: string;
}

const compareMoneda = (a: string | null, b: string | null): number => {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
};

/** Ordena entradas por moneda con el criterio de este módulo (código; desconocida al final). */
export const sortByMoneda = <T extends { moneda: string | null }>(entries: T[]): T[] =>
  [...entries].sort((a, b) => compareMoneda(a.moneda, b.moneda));

/** ¿El importe es cero en centavos enteros? (no en lo que se ve redondeado) */
export const isZeroAmount = (amount: number): boolean => Math.round(amount * 100) === 0;

/**
 * Qué monedas mostrar de un total por moneda: se ocultan las que dan cero
 * (`isZeroAmount`) cuando otra tiene importe. Si todas dan cero, se conserva la
 * única moneda (una sola moneda se ve como siempre) o, con varias o ninguna, no
 * queda ninguna: quien pinta muestra un solo 0 sin símbolo (EC-600). Lo usan
 * `CurrencyTotalsValue`, la antigüedad de CxC y el Top 5 de Compras.
 */
export const visibleCurrencyEntries = <T>(entries: T[], amountOf: (entry: T) => number): T[] => {
  const conImporte = entries.filter((entry) => !isZeroAmount(amountOf(entry)));
  if (conImporte.length > 0) return conImporte;
  return entries.length === 1 ? entries : [];
};

/** Suma importes de UNA misma moneda en centavos enteros. */
export const sumAmounts = (amounts: readonly number[]): number =>
  amounts.reduce((cents, amount) => cents + Math.round(amount * 100), 0) / 100;

/**
 * Acumulador por moneda. `add(moneda)` sin importe registra la moneda con 0:
 * sirve para que un indicador liste TODAS las monedas del conjunto (como
 * `InvoiceStats`), también las que no aportan a ese indicador.
 */
export const createCurrencyTotals = () => {
  const cents = new Map<string | null, number>();
  return {
    add(moneda: string | null, amount = 0) {
      cents.set(moneda, (cents.get(moneda) ?? 0) + Math.round(amount * 100));
    },
    list(): CurrencyTotal[] {
      return sortByMoneda([...cents].map(([moneda, c]) => ({ moneda, total: c / 100 })));
    },
  };
};

/** Suma `getAmount` de cada elemento agrupando por `getMoneda`. */
export const sumByCurrency = <T>(
  items: readonly T[],
  getMoneda: (item: T) => string | null,
  getAmount: (item: T) => number,
): CurrencyTotal[] => {
  const totals = createCurrencyTotals();
  for (const item of items) totals.add(getMoneda(item), getAmount(item));
  return totals.list();
};

/**
 * Importe en SU moneda; sin moneda conocida, sin símbolo (EC-600). La regla es
 * la de `moneyFormatFor`, con `options` (p. ej. `maximumFractionDigits`)
 * encima.
 */
export const formatInCurrency = (
  value: number,
  moneda: string | null,
  options?: Intl.NumberFormatOptions,
): string => formatCurrency(value, moneyFormatFor(moneda, options));

/** Agrupa elementos por moneda conservando su orden dentro de cada grupo. */
export const groupByCurrency = <T>(
  items: readonly T[],
  getMoneda: (item: T) => string | null,
): { moneda: string | null; items: T[] }[] => {
  const groups = new Map<string | null, T[]>();
  for (const item of items) {
    const moneda = getMoneda(item);
    const group = groups.get(moneda);
    if (group) group.push(item);
    else groups.set(moneda, [item]);
  }
  return sortByMoneda([...groups].map(([moneda, groupItems]) => ({ moneda, items: groupItems })));
};
