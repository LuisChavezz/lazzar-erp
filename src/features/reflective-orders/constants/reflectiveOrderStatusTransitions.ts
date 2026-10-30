import type { ReflectiveOrderStatus } from "../interfaces/reflective-order.interface";

/**
 * Transiciones de estatus de una orden de reflejante (`estatus_reflejante`,
 * 1-7).
 *
 * El backend NO impone reglas de transición (nucleo-erp #755): su `PATCH`
 * acepta cualquier valor del enum mientras la orden no esté cancelada. El
 * frontend tampoco las impone —mismo criterio que
 * `embroideryStatusTransitions`—, con una sola excepción: el `7` (Cancelado)
 * no se ofrece como DESTINO. Cancelar es irreversible (una orden en `7`
 * responde `400` a cualquier `PATCH`) y hoy no libera el cupo del pedido, así
 * que no se deja a un clic del selector.
 */

export const REFLECTIVE_ORDER_STATUS_CODES: readonly ReflectiveOrderStatus[] = [
  1, 2, 3, 4, 5, 6, 7,
];

/** Completado: el backend sella `fecha_fin` al entrar aquí. */
export const REFLECTIVE_ORDER_COMPLETED_STATUS: ReflectiveOrderStatus = 5;

/** Cancelado: sin salida, y nunca ofrecido como destino. */
const CANCELLED_STATUS: ReflectiveOrderStatus = 7;

/**
 * ¿La orden está en un estatus terminal? Es la fuente ÚNICA de esa pregunta:
 * la ficha la usa para pasar entera a solo lectura y `getAvailableTransitions`
 * para quedarse sin destinos, así que no pueden discrepar.
 */
export const isTerminalStatus = (estatus: ReflectiveOrderStatus): boolean =>
  estatus === CANCELLED_STATUS;

/**
 * Estatus a los que la orden puede pasar desde el suyo: todos los demás menos
 * el `7`. Vacío en un estatus terminal.
 */
export const getAvailableTransitions = (
  currentStatus: ReflectiveOrderStatus,
): ReflectiveOrderStatus[] => {
  if (isTerminalStatus(currentStatus)) return [];
  return REFLECTIVE_ORDER_STATUS_CODES.filter(
    (estatus) => estatus !== currentStatus && estatus !== CANCELLED_STATUS,
  );
};
