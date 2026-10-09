import { formatMoneyValue, NO_CURRENCY_FORMAT } from "@/src/utils/formatCurrency";
import { parseLocalDate } from "@/src/utils/formatDate";
import { formatPercentageNumber } from "@/src/utils/percentage";

/**
 * Formato de los indicadores de clientes, compartido por la sección y su
 * drill-down para que un mismo importe, porcentaje o fecha se lea igual en la
 * tarjeta y en el diálogo.
 */

/** Importe del backend sin símbolo: el payload no trae moneda y mezcla varias. */
export const formatKpiMonto = (value: number): string => formatMoneyValue(value, NO_CURRENCY_FORMAT);

/** Porcentaje del backend (0–100, 1 decimal) como "25.0%": siempre con su decimal. */
export const formatKpiPct = (value: number): string => `${formatPercentageNumber(value, 1)}%`;

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" };

/**
 * Fecha-calendario "YYYY-MM-DD" (`fecha_vencimiento`) como "06/10/2026", mismo
 * formato que los indicadores de OP. Pasa por `parseLocalDate`: con `new Date()`
 * sería medianoche UTC y en México saldría el día anterior. "—" sin valor o si
 * no se puede leer.
 */
export const formatKpiDate = (value: string): string => {
  const date = parseLocalDate(value);
  return date ? date.toLocaleDateString("es-MX", DATE_FORMAT) : "—";
};

/** "1 cliente facturado" / "3 clientes facturados": la palabra según el conteo. */
export const plural = (count: number, singular: string, pluralForm: string): string =>
  count === 1 ? singular : pluralForm;
