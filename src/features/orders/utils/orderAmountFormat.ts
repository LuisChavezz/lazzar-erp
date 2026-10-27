import { formatAmountNoCurrency } from "@/src/utils/formatCurrency";

/**
 * Importe de un pedido en listados y exportaciones (`subtotal`, `gran_total` de
 * `PedidoListItem`): número con 2 decimales SIN símbolo, y "—" si el backend no
 * lo manda (filtro contable). Sin símbolo porque la fila solo trae el id de
 * `moneda`, no su código, y un "$" afirmaría pesos en un pedido en otra moneda.
 *
 * Único punto de esa decisión: cuando el listado pueda resolver la moneda a su
 * código, se cambia aquí y no en cada tabla.
 */
export const formatOrderAmountOrDash = (value: string | number | null | undefined): string =>
  formatAmountNoCurrency(value);
