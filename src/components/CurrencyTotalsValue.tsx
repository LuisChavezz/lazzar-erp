import { KpiTaggedBlocks } from "@/src/components/KpiCurrency";
import { formatInCurrency, visibleCurrencyEntries, type CurrencyTotal } from "@/src/utils/currencyTotals";
import { currencyHasOwnSymbol, type MoneyFormatOverrides } from "@/src/utils/formatCurrency";

/**
 * Totales que el frontend suma POR MONEDA (EC-601, `currencyTotals`) dentro del
 * valor de una tarjeta o de una línea de texto. Mismo criterio que las secciones
 * de indicadores (`KpiCurrency`): cada importe con el símbolo y el código de SU
 * moneda, nunca sumado con los de otra.
 */

/** Etiqueta de un importe cuya moneda no se conoce (se pinta sin símbolo). */
export const UNKNOWN_CURRENCY_TAG = "Sin moneda";

/** Código de la moneda, o la etiqueta del total sin moneda conocida. */
const tagOf = (entry: CurrencyTotal): string =>
  entry.moneda ?? entry.etiqueta ?? UNKNOWN_CURRENCY_TAG;

/**
 * Importe de un bloque, con los decimales que pidió quien llama: símbolo
 * estrecho de su moneda (`narrowSymbol`, como `formatKpiCurrencyAmount`; el
 * código va aparte). Sin moneda, o si la moneda no tiene símbolo propio y
 * `Intl` repetiría el código (XTS, monedas privadas), sin símbolo.
 */
const formatBlockAmount = (
  { moneda, total }: CurrencyTotal,
  options?: MoneyFormatOverrides,
): string =>
  moneda && currencyHasOwnSymbol(moneda)
    ? formatInCurrency(total, moneda, { currencyDisplay: "narrowSymbol", ...options })
    : formatInCurrency(total, null, options);

/**
 * Valor de una tarjeta con un importe por moneda (qué se ve y si lleva código
 * lo decide `visibleCurrencyEntries`):
 * - Conjunto de una sola moneda: el importe solo, formateado con `options` en
 *   SU moneda (con MXN se ve exactamente igual que antes de EC-601).
 * - Conjunto de varias: un bloque por moneda a la vista con su código
 *   (`KpiTaggedBlocks`), aunque las demás estén en cero y quede uno solo.
 * - Nada a la vista (conjunto vacío, o varias monedas todas en cero): 0 sin
 *   símbolo, porque no hay moneda que afirmar (EC-600).
 */
export function CurrencyTotalsValue({
  totals: allTotals,
  options,
}: {
  totals: CurrencyTotal[];
  options?: MoneyFormatOverrides;
}) {
  const { visibles: totals, showCodes } = visibleCurrencyEntries(allTotals, (entry) => entry.total);
  if (!showCodes || totals.length === 0) {
    const [only] = totals;
    return <>{formatInCurrency(only?.total ?? 0, only?.moneda ?? null, options)}</>;
  }
  return (
    <KpiTaggedBlocks
      blocks={totals.map((entry) => ({
        key: tagOf(entry),
        value: formatBlockAmount(entry, options),
        tag: tagOf(entry),
      }))}
    />
  );
}

/**
 * ¿`CurrencyTotalsValue` pintará bloques con código? Para apilar la insignia de
 * la tarjeta (`stackTrend`): un bloque con su código ya no cabe junto a ella,
 * aunque sea uno solo.
 */
export const showsCurrencyCodes = (totals: CurrencyTotal[]): boolean => {
  const { visibles, showCodes } = visibleCurrencyEntries(totals, (entry) => entry.total);
  return showCodes && visibles.length > 0;
};

const LIST_FORMAT = new Intl.ListFormat("es", { style: "long", type: "conjunction" });

/**
 * Los mismos totales en una frase ("$1,200.00 MXN y $300.00 USD", o
 * "$88,264.68 MXN" si el resto está en cero). Con un conjunto de una sola
 * moneda, el importe solo en su moneda, como antes. Mismo criterio que
 * `CurrencyTotalsValue` (`visibleCurrencyEntries`).
 */
export const formatCurrencyTotalsInline = (
  allTotals: CurrencyTotal[],
  options?: MoneyFormatOverrides,
): string => {
  const { visibles: totals, showCodes } = visibleCurrencyEntries(allTotals, (entry) => entry.total);
  if (!showCodes || totals.length === 0) {
    const [only] = totals;
    return formatInCurrency(only?.total ?? 0, only?.moneda ?? null, options);
  }
  return LIST_FORMAT.format(
    totals.map((entry) => `${formatBlockAmount(entry, options)} ${tagOf(entry)}`),
  );
};
