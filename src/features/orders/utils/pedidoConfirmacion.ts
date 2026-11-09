import type { PedidoListItem } from "../interfaces/order.interface";

/**
 * Un pedido se considera confirmado cuando ya tiene fecha de confirmación (la
 * fija Mesa de Control; solo se puede volver a vaciar si el pedido no tiene
 * programaciones: con ellas el backend responde 400 en `fecha_confirmacion`,
 * EC-750). Recibe solo ese campo para
 * que otros contratos de pedido (p. ej. los pedidos especiales de Producción)
 * compartan la misma regla. La usan el punto de color, el filtro "Por
 * confirmar / Confirmado", los KPIs de Mesa de Control y `canProgramarPedido`.
 */
export function isOrderConfirmed(order: Pick<PedidoListItem, "fecha_confirmacion">): boolean {
  return Boolean(order.fecha_confirmacion);
}
