import { formatCurrency, NO_CURRENCY_FORMAT } from "@/src/utils/formatCurrency";

/**
 * Importe del formulario de cotización/pedido con el CÓDIGO de su moneda
 * ("MXN 878.00", "USD 878.00"), no con el símbolo: "$" es igual en pesos y en
 * dólares, así que no dice en qué moneda está la captura (EC-563, CO-02).
 *
 * Sin código (la moneda aún no está elegida o no está en el catálogo) el
 * importe va sin símbolo: un "$" afirmaría una moneda que no se conoce.
 */
export const formatQuoteAmount = (value: number, monedaCodigo: string | null): string =>
  monedaCodigo
    ? formatCurrency(value, { currency: monedaCodigo, currencyDisplay: "code" })
    : formatCurrency(value, NO_CURRENCY_FORMAT);
