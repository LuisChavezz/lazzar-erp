import { UNKNOWN_CURRENCY_TAG } from "@/src/components/CurrencyTotalsValue";
import type { Currency } from "@/src/features/currency/interfaces/currency.interface";
import { findCurrency } from "@/src/features/currency/utils/currencyLookup";
import { sortByMoneda, sumAmounts, type CurrencyTotal } from "@/src/utils/currencyTotals";
import { safeParseAmount } from "@/src/utils/formatCurrency";
import type { PedidoListItem } from "../interfaces/order.interface";

/**
 * "Valor total" de una lista de pedidos POR MONEDA (EC-601; lo pinta la Mesa de
 * Control). El listado solo trae la PK de la moneda (`moneda`), así que el
 * código ISO sale del catálogo (`currencies`).
 *
 * Se agrupa por la PK ANTES de resolver su código, así que dos monedas
 * distintas nunca se suman aunque el catálogo no traiga alguna. Una PK sin
 * código (catálogo con error, o que no la trae) se pinta sin símbolo (EC-600);
 * si hay varias así, cada una lleva su PK en la etiqueta para no confundirlas.
 */
export const valorTotalPorMoneda = (
  orders: PedidoListItem[],
  currencies: Currency[] | undefined,
): CurrencyTotal[] => {
  const porPk = new Map<number, number[]>();
  for (const o of orders) {
    const montos = porPk.get(o.moneda) ?? [];
    montos.push(safeParseAmount(o.gran_total));
    porPk.set(o.moneda, montos);
  }
  const entries = [...porPk]
    .sort(([a], [b]) => a - b)
    .map(([pk, montos]) => ({
      pk,
      moneda: findCurrency(currencies, pk)?.codigo_iso || null,
      total: sumAmounts(montos),
    }));
  const sinCodigo = entries.filter((entry) => entry.moneda === null).length;
  return sortByMoneda(
    entries.map(({ pk, moneda, total }) =>
      moneda === null && sinCodigo > 1
        ? { moneda, total, etiqueta: `${UNKNOWN_CURRENCY_TAG} (${pk})` }
        : { moneda, total },
    ),
  );
};
