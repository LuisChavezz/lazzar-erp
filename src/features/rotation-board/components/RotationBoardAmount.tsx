import { UNKNOWN_CURRENCY_TAG } from "@/src/components/CurrencyTotalsValue";
import { HIDDEN_PEDIDO_AMOUNTS_REASON } from "@/src/features/orders/constants/pedidoKpis";
import { formatInCurrency } from "@/src/utils/currencyTotals";
import { formatKpiTaggedCurrencyAmount } from "@/src/utils/kpiFormat";
import { importeCurrencyTotals, type ImportePorMoneda } from "../utils/rotationBoardAmounts";

/** Por qué una fila sin importes dice 0 y no "—" (que es "sin permiso"). */
export const NO_SALES_AMOUNT_TITLE = "Sin venta en el periodo";

/**
 * Importe vendido de UNA fila del tablero, por moneda (`importe_por_moneda`).
 *
 * - `null` (sin permiso de importes): "—", nunca un 0.
 * - `{}` (sin venta): "0" atenuado y sin símbolo, como el resto de ceros de la
 *   tabla (no hay moneda que afirmar, EC-600).
 * - Con venta: una línea por moneda, SIEMPRE con su código: en una tabla, dos
 *   filas de una sola moneda cada una ("$100" MXN y "$100" USD) se leerían
 *   iguales sin él.
 */
export function RotationAmountCell({ importes }: { importes: ImportePorMoneda | null }) {
  if (importes === null) {
    return (
      <span className="text-slate-400" title={HIDDEN_PEDIDO_AMOUNTS_REASON}>
        —
      </span>
    );
  }
  const totals = importeCurrencyTotals(importes);
  if (totals.length === 0) {
    return (
      <span className="tabular-nums text-slate-400" title={NO_SALES_AMOUNT_TITLE}>
        0
      </span>
    );
  }
  return (
    <div className="flex flex-col items-end">
      {totals.map(({ moneda, total }) => (
        <span
          key={moneda ?? UNKNOWN_CURRENCY_TAG}
          className="whitespace-nowrap tabular-nums text-slate-700 dark:text-slate-200"
        >
          {moneda ? formatKpiTaggedCurrencyAmount(total, moneda) : formatInCurrency(total, null)}{" "}
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            {moneda ?? UNKNOWN_CURRENCY_TAG}
          </span>
        </span>
      ))}
    </div>
  );
}
