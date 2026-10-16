import { formatMoneyValue } from "@/src/utils/formatCurrency";

/**
 * Importe de un indicador de clientes con el símbolo de SU moneda (código ISO
 * del payload). `narrowSymbol`: es-MX pinta USD como "USD 1,234.00", y la UI ya
 * muestra el código aparte (mismo criterio que `CustomerResumenKpis`). Un código
 * que `Intl` no reconozca cae a número sin símbolo (`formatCurrency`).
 */
export const formatKpiCurrencyAmount = (value: number, moneda: string): string =>
  formatMoneyValue(value, { currency: moneda, currencyDisplay: "narrowSymbol" });
