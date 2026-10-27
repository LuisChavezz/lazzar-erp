import { KpiTaggedBlocks } from "@/src/components/KpiCurrency";
import { formatInCurrency, type CurrencyTotal } from "@/src/utils/currencyTotals";
import { currencyHasOwnSymbol } from "@/src/utils/formatCurrency";

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
  options?: Intl.NumberFormatOptions,
): string =>
  moneda && currencyHasOwnSymbol(moneda)
    ? formatInCurrency(total, moneda, { currencyDisplay: "narrowSymbol", ...options })
    : formatInCurrency(total, null, options);

/**
 * Valor de una tarjeta con un importe por moneda.
 * - Una moneda: el importe solo, formateado con `options` en SU moneda (con
 *   MXN se ve exactamente igual que antes de EC-601).
 * - Varias: un bloque por moneda con su código (`KpiTaggedBlocks`), con los
 *   mismos decimales (`options`).
 * - Ninguna (conjunto vacío): 0 sin símbolo, porque no hay moneda que afirmar
 *   (EC-600).
 */
export function CurrencyTotalsValue({
  totals,
  options,
}: {
  totals: CurrencyTotal[];
  options?: Intl.NumberFormatOptions;
}) {
  if (totals.length <= 1) {
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

const LIST_FORMAT = new Intl.ListFormat("es", { style: "long", type: "conjunction" });

/**
 * Los mismos totales en una frase ("$1,200.00 MXN y $300.00 USD"). Con una
 * sola moneda, el importe solo en su moneda, como antes.
 */
export const formatCurrencyTotalsInline = (
  totals: CurrencyTotal[],
  options?: Intl.NumberFormatOptions,
): string => {
  if (totals.length <= 1) {
    const [only] = totals;
    return formatInCurrency(only?.total ?? 0, only?.moneda ?? null, options);
  }
  return LIST_FORMAT.format(
    totals.map((entry) => `${formatBlockAmount(entry, options)} ${tagOf(entry)}`),
  );
};
