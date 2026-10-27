import { UNKNOWN_CURRENCY_TAG } from "@/src/components/CurrencyTotalsValue";
import type { Currency } from "@/src/features/currency/interfaces/currency.interface";
import { findCurrency } from "@/src/features/currency/utils/currencyLookup";
import { createCurrencyTotals, sumAmounts, type CurrencyTotal } from "@/src/utils/currencyTotals";
import { safeParseAmount } from "@/src/utils/formatCurrency";
import type { PedidoListItem } from "../interfaces/order.interface";

/**
 * "Valor total" de una lista de pedidos POR MONEDA (EC-601; lo pinta la Mesa de
 * Control). El listado solo trae la PK de la moneda (`moneda`), así que el
 * código ISO sale del catálogo (`currencies`).
 *
 * Se agrupa por la PK ANTES de resolver su código, así que dos monedas
 * distintas nunca se suman aunque el catálogo no traiga alguna. Luego las PK
 * que resuelven al MISMO código (una MXN global y una MXN propia de la empresa)
 * se juntan en un solo total: mismo código, misma moneda, como agrupan CxC y
 * Facturación. Una PK sin código (catálogo con error, o que no la trae) queda
 * aparte y se pinta sin símbolo (EC-600); si hay varias así, cada una lleva su
 * PK en la etiqueta para no confundirlas.
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
  const porCodigo = createCurrencyTotals();
  const sinCodigo: { pk: number; total: number }[] = [];
  for (const [pk, montos] of [...porPk].sort(([a], [b]) => a - b)) {
    const codigo = findCurrency(currencies, pk)?.codigo_iso || null;
    if (codigo) porCodigo.add(codigo, sumAmounts(montos));
    else sinCodigo.push({ pk, total: sumAmounts(montos) });
  }
  return [
    ...porCodigo.list(),
    ...sinCodigo.map(({ pk, total }) =>
      sinCodigo.length > 1
        ? { moneda: null, total, etiqueta: `${UNKNOWN_CURRENCY_TAG} (${pk})` }
        : { moneda: null, total },
    ),
  ];
};
