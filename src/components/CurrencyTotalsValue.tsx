import { KpiTaggedBlocks } from "@/src/components/KpiCurrency";
import { formatInCurrency, type CurrencyTotal } from "@/src/utils/currencyTotals";

/**
 * Totales que el frontend suma POR MONEDA (EC-601, `currencyTotals`) dentro del
 * valor de una tarjeta o de una línea de texto. Mismo criterio que las secciones
 * de indicadores (`KpiCurrency`): cada importe con el símbolo y el código de SU
 * moneda, nunca sumado con los de otra.
 */

/** Etiqueta de un importe cuya moneda no se conoce (se pinta sin símbolo). */
export const UNKNOWN_CURRENCY_TAG = "Sin moneda";

/**
 * Importe de un bloque, con los decimales que pidió quien llama: símbolo
 * estrecho de su moneda (`narrowSymbol`, como `formatKpiCurrencyAmount`; el
 * código va aparte) o, sin moneda, sin símbolo.
 */
const formatBlockAmount = (
  { moneda, total }: CurrencyTotal,
  options?: Intl.NumberFormatOptions,
): string => formatInCurrency(total, moneda, { currencyDisplay: "narrowSymbol", ...options });

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
        key: entry.moneda ?? UNKNOWN_CURRENCY_TAG,
        value: formatBlockAmount(entry, options),
        tag: entry.moneda ?? UNKNOWN_CURRENCY_TAG,
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
    totals.map((entry) => `${formatBlockAmount(entry, options)} ${entry.moneda ?? UNKNOWN_CURRENCY_TAG}`),
  );
};
