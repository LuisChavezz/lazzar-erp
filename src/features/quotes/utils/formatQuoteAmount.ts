import { formatCurrency } from "@/src/utils/formatCurrency";

/**
 * Importe del formulario de cotización/pedido con el CÓDIGO de su moneda
 * ("MXN 878.00", "USD 878.00"), no con el símbolo: "$" es igual en pesos y en
 * dólares, así que no dice en qué moneda está la captura (EC-563, CO-02).
 *
 * Sin código (la moneda aún no está elegida o no está en el catálogo) el
 * importe va sin símbolo: un "$" afirmaría una moneda que no se conoce.
 *
 * Siempre con 2 decimales (`formatCurrency`): el backend manda los importes con
 * 2, y los decimales ISO por defecto de `Intl` redondearían un JPY a enteros o
 * darían 3 a un KWD, distinto del total por moneda de la exportación.
 */
export const formatQuoteAmount = (value: number, monedaCodigo: string | null): string =>
  formatCurrency(value, monedaCodigo, { currencyDisplay: "code" });
