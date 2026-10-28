import type { Row } from "@tanstack/react-table";

type WithAmount = { moneda_codigo: string | null; importe_sin_iva: number };

/**
 * Compara dos importes de cotización agrupando por MONEDA (EC-618): primero el
 * código (sin moneda al final, como `sortByMoneda` de EC-601) y, dentro de la
 * misma moneda, el importe. Importes de monedas distintas no se comparan entre
 * sí. Con una sola moneda queda el mismo orden numérico de siempre.
 */
export const compareQuoteAmounts = (a: WithAmount, b: WithAmount): number => {
  const monedaA = a.moneda_codigo || null;
  const monedaB = b.moneda_codigo || null;
  if (monedaA !== monedaB) {
    if (monedaA === null) return 1;
    if (monedaB === null) return -1;
    return monedaA < monedaB ? -1 : 1;
  }
  const amountA = Number.isFinite(a.importe_sin_iva) ? a.importe_sin_iva : 0;
  const amountB = Number.isFinite(b.importe_sin_iva) ? b.importe_sin_iva : 0;
  return amountA === amountB ? 0 : amountA < amountB ? -1 : 1;
};

/** `sortingFn` de TanStack Table para la columna "Importe sin IVA". */
export const quoteAmountSortingFn = <T extends WithAmount>(rowA: Row<T>, rowB: Row<T>): number =>
  compareQuoteAmounts(rowA.original, rowB.original);
