import { formatCurrencyTotalsInline } from "@/src/components/CurrencyTotalsValue";
import { isZeroAmount, sumByCurrency, type CurrencyTotal } from "@/src/utils/currencyTotals";
import type { Quote } from "../interfaces/quote.interface";

/** Columna de importe que suma el total de la exportación: la que muestra la tabla. */
export const QUOTE_EXPORT_TOTAL_FIELD = "importe_sin_iva";

/**
 * Total de la exportación de cotizaciones POR MONEDA (EC-618), sobre
 * `importe_sin_iva`, con las reglas de EC-601 (`sumByCurrency`).
 *
 * Única diferencia: el grupo sin moneda (`null`) se descarta cuando su importe
 * es 0. Un borrador sin moneda casi siempre está vacío, y como entrada del
 * conjunto haría que `visibleCurrencyEntries` pusiera el código a un total de
 * una sola moneda real. Se filtra aquí, antes del helper compartido, para no
 * cambiar lo que pintan las pantallas de EC-601.
 */
export const getQuoteExportTotals = (
  quotes: readonly Pick<Quote, "importe_sin_iva" | "moneda_codigo">[],
): CurrencyTotal[] =>
  sumByCurrency(
    quotes,
    (quote) => quote.moneda_codigo || null,
    (quote) => (Number.isFinite(quote.importe_sin_iva) ? quote.importe_sin_iva : 0),
  ).filter((entry) => entry.moneda !== null || !isZeroAmount(entry.total));

/** El mismo total como texto ("$1,200.00 MXN y $300.00 USD"). */
export const formatQuoteExportTotal = (
  quotes: readonly Pick<Quote, "importe_sin_iva" | "moneda_codigo">[],
): string => formatCurrencyTotalsInline(getQuoteExportTotals(quotes));
