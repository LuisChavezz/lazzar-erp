import { REFLECTIVE_ORDER_COMPLETED_STATUS } from "../constants/reflectiveOrderStatusTransitions";
import type {
  ReflectiveOrderStatus,
  UpdateReflectiveOrderPayload,
} from "../interfaces/reflective-order.interface";

/**
 * Cuerpo del `PATCH` que cambia el estatus de una orden de reflejante.
 *
 * `fecha_fin` es de solo lectura en la UI y la regla vive aquí:
 *  - Al ENTRAR a `5` (Completado) NO se envía: el backend la sella con la hora
 *    actual solo si la clave falta del cuerpo y la orden no tenía una. Mandarla
 *    —aunque fuera `null`— impediría el sello.
 *  - Al SALIR de `5` se envía `fecha_fin: null` en el mismo `PATCH`: el backend
 *    conserva la fecha anterior, y una orden reabierta no debe aparentar que ya
 *    terminó.
 *  - Entre dos estatus que no son `5`, no se toca.
 *
 * Función PURA para poder probar cada caso sin React (ver `tests/unit`).
 */
export const buildReflectiveStatusPayload = (
  current: ReflectiveOrderStatus,
  next: ReflectiveOrderStatus,
): UpdateReflectiveOrderPayload =>
  current === REFLECTIVE_ORDER_COMPLETED_STATUS && next !== REFLECTIVE_ORDER_COMPLETED_STATUS
    ? { estatus_reflejante: next, fecha_fin: null }
    : { estatus_reflejante: next };
