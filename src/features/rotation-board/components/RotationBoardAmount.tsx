import { UNKNOWN_CURRENCY_TAG, formatCurrencyBlockAmount } from "@/src/components/CurrencyTotalsValue";
import { KpiMutedValue } from "@/src/components/KpiCurrency";
import { HIDDEN_PEDIDO_AMOUNTS_REASON } from "@/src/features/orders/constants/pedidoKpis";
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
      {totals.map((entry) => (
        <span
          key={entry.moneda ?? UNKNOWN_CURRENCY_TAG}
          className="whitespace-nowrap tabular-nums text-slate-700 dark:text-slate-200"
        >
          {formatCurrencyBlockAmount(entry)}{" "}
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            {entry.moneda ?? UNKNOWN_CURRENCY_TAG}
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * Valor de la tarjeta "Vendido" (`resumen.importe_por_moneda`): un bloque por
 * moneda con su código, como `KpiCurrencyBlocks`, pero en línea cuando la
 * tarjeta ocupa una fila entera y apilados cuando es una columna (`xl`).
 *
 * - `null` (sin permiso): "—", nunca un 0.
 * - `{}` (sin venta): "Sin venta en el periodo" atenuado.
 */
export function RotationSoldAmountValue({ importes }: { importes: ImportePorMoneda | null }) {
  if (importes === null) {
    return (
      <span className="text-2xl font-bold text-slate-300 dark:text-slate-600" title={HIDDEN_PEDIDO_AMOUNTS_REASON}>
        —
      </span>
    );
  }
  const totals = importeCurrencyTotals(importes);
  if (totals.length === 0) {
    return <KpiMutedValue>{NO_SALES_AMOUNT_TITLE}</KpiMutedValue>;
  }
  return (
    <span className="flex flex-wrap gap-x-6 gap-y-1 xl:flex-col xl:gap-x-0">
      {totals.map((entry) => (
        <span
          key={entry.moneda ?? UNKNOWN_CURRENCY_TAG}
          className="flex items-baseline gap-2 whitespace-nowrap tabular-nums"
        >
          <span className="text-lg font-bold text-slate-800 dark:text-white">
            {formatCurrencyBlockAmount(entry)}
          </span>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {entry.moneda ?? UNKNOWN_CURRENCY_TAG}
          </span>
        </span>
      ))}
    </span>
  );
}
