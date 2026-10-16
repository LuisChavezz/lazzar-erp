import { formatMoneyValue, NO_CURRENCY_FORMAT } from "@/src/utils/formatCurrency";
import { parseLocalDate } from "@/src/utils/formatDate";
import { formatPercentageNumber } from "@/src/utils/percentage";

/**
 * Formato compartido de las secciones de indicadores (OP, clientes, órdenes de
 * compra, recepciones…), para que un mismo importe, porcentaje o fecha se lea
 * igual en cualquier tarjeta y su drill-down. Antes vivía copiado en cada
 * módulo.
 */

/**
 * Importe del backend sin símbolo, SOLO para payloads de KPIs que no traen
 * moneda (o que suman varias): ahí un "$" afirmaría pesos. Los datos por moneda
 * (`por_moneda[]`, filas con `moneda`) van con `formatKpiCurrencyAmount`.
 */
export const formatKpiMonto = (value: number): string => formatMoneyValue(value, NO_CURRENCY_FORMAT);

/**
 * Importe de un indicador con el símbolo de SU moneda (código ISO del payload,
 * p. ej. `por_moneda[].moneda`). `narrowSymbol`: es-MX pinta USD como
 * "USD 1,234.00", y la UI ya muestra el código aparte (mismo criterio que
 * `CustomerResumenKpis`). Un código que `Intl` no reconozca cae a número sin
 * símbolo (`formatCurrency`).
 */
export const formatKpiCurrencyAmount = (value: string | number, moneda: string): string =>
  formatMoneyValue(value, { currency: moneda, currencyDisplay: "narrowSymbol" });

/**
 * Como `formatKpiCurrencyAmount`, con signo explícito ("+$1,250.00" /
 * "-$80.00" / "$0.00"): para diferencias por moneda, donde el signo ES el dato.
 */
export const formatKpiSignedCurrencyAmount = (value: string | number, moneda: string): string =>
  formatMoneyValue(value, { currency: moneda, currencyDisplay: "narrowSymbol", signDisplay: "exceptZero" });

/** Porcentaje del backend (0–100, 1 decimal) como "25.0%": siempre con su decimal. */
export const formatKpiPct = (value: number): string => `${formatPercentageNumber(value, 1)}%`;

/** Como `formatKpiPct`, pero `null` (denominador 0) → "—", nunca un 0%. */
export const formatKpiPctOrDash = (value: number | null): string =>
  value === null ? "—" : formatKpiPct(value);

/**
 * Porcentaje con signo explícito ("+3.0%" / "-1.5%" / "0.0%") para
 * variaciones; `null` → "—".
 */
export const formatKpiSignedPctOrDash = (value: number | null): string => {
  if (value === null) return "—";
  return value > 0 ? `+${formatKpiPct(value)}` : formatKpiPct(value);
};

const DIAS_FORMAT = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Días promedio con un decimal ("7.2 días"); `null` → "—". */
export const formatKpiDias = (value: number | null): string =>
  value === null ? "—" : `${DIAS_FORMAT.format(value)} días`;

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" };

/**
 * Fecha de un indicador como "30/09/2026" (es-MX). Pasa por `parseLocalDate`,
 * que distingue los dos tipos que traen los contratos:
 * - fecha-calendario "YYYY-MM-DD" (p. ej. `fecha_entrega_estimada`): se arma
 *   como día LOCAL; con `new Date()` sería medianoche UTC y en México saldría
 *   el día anterior.
 * - datetime UTC con "T" (p. ej. `fecha_fin`): `Date` nativo, que respeta su
 *   offset, y se muestra en la zona del usuario.
 * "—" sin valor o si no se puede leer.
 */
export const formatKpiDate = (value: string | null): string => {
  const date = parseLocalDate(value);
  return date ? date.toLocaleDateString("es-MX", DATE_FORMAT) : "—";
};

/** "1 OC" / "3 OCs": la palabra según el conteo. */
export const plural = (count: number, singular: string, pluralForm: string): string =>
  count === 1 ? singular : pluralForm;
