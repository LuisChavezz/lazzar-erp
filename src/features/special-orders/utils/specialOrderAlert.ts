import type { SpecialOrderListItem } from "../interfaces/special-order.interface";

type AlertFields = Pick<SpecialOrderListItem, "activo" | "atrasado">;

/**
 * Alerta de 24 h de un pedido especial: el servidor ya decide `atrasado`; aquí
 * solo se descartan los pedidos dados de baja, que el listado incluye y también
 * marca atrasados. Exige `activo === true`: sin el campo (el backend aún no lo
 * manda, EC-873) no hay alerta.
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
