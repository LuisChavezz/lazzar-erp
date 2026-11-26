import { formatQuantityValue } from "@/src/utils/formatCurrency";

/**
 * Cantidad del stock digital tal como llega del backend. Con
 * `shortageWhenNegative`, un valor negativo (la disponibilidad digital) se pinta
 * en rojo como FALTANTE; el signo y la cifra no se tocan.
 */
export function DigitalStockQuantity({
  value,
  shortageWhenNegative = false,
  bold = false,
}: {
  value: number;
  shortageWhenNegative?: boolean;
  bold?: boolean;
}) {
  const isShortage = shortageWhenNegative && value < 0;
  return (
    <span
      className={`tabular-nums ${bold ? "font-semibold" : ""} ${
        isShortage
          ? "font-semibold text-rose-600 dark:text-rose-400"
          : "text-slate-700 dark:text-slate-200"
      }`}
      title={isShortage ? "Faltante" : undefined}
    >
      {formatQuantityValue(value)}
      {isShortage && <span className="sr-only"> (faltante)</span>}
    </span>
  );
}
