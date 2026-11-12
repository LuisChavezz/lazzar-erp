import type { SpecialOrderListItem } from "../interfaces/special-order.interface";

type AlertFields = Pick<SpecialOrderListItem, "activo" | "atrasado">;

/**
 * Alerta de 24 h de un pedido especial: el servidor decide `atrasado` (y desde
 * EC-873 lo manda en `false` para pedidos inactivos o cancelados). Exigir
 * además `activo === true` es una salvaguarda: el listado incluye pedidos dados
 * de baja, y una respuesta sin `activo` no muestra la alerta.
 */
export const isAtrasadoActivo = (order: AlertFields): boolean =>
  order.activo === true && order.atrasado === true;

/**
 * Orden por defecto del listado: primero los atrasados activos y después el
 * resto, cada grupo en el orden en que llegó del servidor (`-fecha_confirmacion,
 * -id`). Devuelve el mismo arreglo si no hay atrasados, así no cambia la
 * referencia que recibe la tabla.
 */
export function sortAtrasadosFirst<T extends AlertFields>(orders: T[]): T[] {
  const atrasados = orders.filter(isAtrasadoActivo);
  if (atrasados.length === 0) return orders;
  return [...atrasados, ...orders.filter((order) => !isAtrasadoActivo(order))];
}
