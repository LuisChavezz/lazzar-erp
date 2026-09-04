import { formatMoneyValue } from "@/src/utils/formatCurrency";

/**
 * Formatea un importe de la cuenta en SU moneda.
 *
 * Cada cuenta bancaria tiene su propia moneda, así que un importe no puede
 * formatearse con el MXN por defecto de `formatCurrency`. Cuando la cuenta no
 * expone `moneda_codigo` (es nullable) se delega sin `currency` en vez de pasar
 * `undefined`, que con `style: "currency"` haría lanzar a `Intl.NumberFormat` y
 * caer en su rama de respaldo.
 *
 * Único punto donde se da formato al dinero de este módulo: nunca se concatena
 * un "$" a mano (que es justo lo que hacía la maqueta a la que reemplaza).
 */
export const formatSaldo = (
  value: string | number,
  monedaCodigo: string | null | undefined,
): string =>
  monedaCodigo
    ? formatMoneyValue(value, { currency: monedaCodigo })
    : formatMoneyValue(value);
