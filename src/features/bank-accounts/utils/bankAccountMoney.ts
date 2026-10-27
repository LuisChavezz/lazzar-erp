import { formatMoneyValue, moneyFormatFor } from "@/src/utils/formatCurrency";

/**
 * Formatea un importe de la cuenta en SU moneda.
 *
 * Cada cuenta bancaria tiene su propia moneda, así que un importe no puede
 * formatearse con el MXN por defecto de `formatCurrency`. Cuando la cuenta no
 * expone `moneda_codigo` (es nullable) el importe va sin símbolo y con 2
 * decimales (`moneyFormatFor`), igual que en el resto de la app: un "$"
 * afirmaría pesos en una cuenta cuya moneda no se conoce.
 *
 * Único punto donde se da formato al dinero de este módulo: nunca se concatena
 * un "$" a mano (que es justo lo que hacía la maqueta a la que reemplaza).
 */
export const formatSaldo = (
  value: string | number,
  monedaCodigo: string | null | undefined,
): string => formatMoneyValue(value, moneyFormatFor(monedaCodigo ?? null));
