import { drfActionErrorMessage } from "./drfWriteErrors";

/**
 * Reglas de edición de estatus compartidas por las órdenes de trabajo de
 * reflejante y corte de manga (nucleo-erp #755). Sus enums son gemelos en forma
 * —1-7, `5` Completado, `7` Cancelado— y solo difieren en el nombre del campo
 * (`estatus_reflejante` / `estatus_corte`) y en la etiqueta del `3`, que cada
 * módulo resuelve con su propia config. Bordado NO entra aquí: su enum es otro
 * (1-8, terminales 7 y 8) y tiene su propio `embroideryStatusTransitions`.
 *
 * El backend NO impone reglas de transición: su `PATCH` acepta cualquier valor
 * mientras la orden no esté cancelada. El frontend tampoco las impone —mismo
 * criterio que bordado—, con una sola excepción: el `7` no se ofrece como
 * DESTINO. Cancelar es irreversible (una orden en `7` responde `400` a
 * cualquier `PATCH`) y hoy no libera el cupo del pedido (nucleo-erp #775).
 */

export type WorkOrderStatus = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const WORK_ORDER_STATUS_CODES: readonly WorkOrderStatus[] = [1, 2, 3, 4, 5, 6, 7];

/** Completado: el backend sella `fecha_fin` al entrar aquí. */
const COMPLETED_STATUS: WorkOrderStatus = 5;

/** Cancelado: sin salida, y nunca ofrecido como destino. */
const CANCELLED_STATUS: WorkOrderStatus = 7;

/**
 * Las únicas prioridades que ofrece el selector de la ficha (1 Alta, 2 Media,
 * 3 Baja): el backend acepta cualquier entero (nucleo-erp #776), pero la UI se
 * cierra a las tres que sabe rotular.
 */
export const WORK_ORDER_PRIORITY_CODES = [1, 2, 3] as const;

/**
 * ¿La orden está en un estatus terminal? Es la fuente ÚNICA de esa pregunta:
 * la ficha la usa para pasar entera a solo lectura y
 * `getWorkOrderTransitions` para quedarse sin destinos, así que no pueden
 * discrepar.
 */
export const isWorkOrderTerminal = (estatus: WorkOrderStatus): boolean =>
  estatus === CANCELLED_STATUS;

/**
 * Estatus a los que la orden puede pasar desde el suyo: todos los demás menos
 * el `7`. Vacío en un estatus terminal.
 */
export const getWorkOrderTransitions = (
  currentStatus: WorkOrderStatus,
): WorkOrderStatus[] => {
  if (isWorkOrderTerminal(currentStatus)) return [];
  return WORK_ORDER_STATUS_CODES.filter(
    (estatus) => estatus !== currentStatus && estatus !== CANCELLED_STATUS,
  );
};

/**
 * Cuerpo del `PATCH` que cambia el estatus, bajo el campo propio de cada
 * módulo (`field`).
 *
 * `fecha_fin` es de solo lectura en la UI y la regla vive aquí:
 *  - Al ENTRAR a `5` (Completado) NO se envía: el backend la sella con la hora
 *    actual solo si la clave falta del cuerpo y la orden no tenía una. Mandarla
 *    —aunque fuera `null`— impediría el sello.
 *  - Al SALIR de `5` se envía `fecha_fin: null` en el mismo `PATCH`: el backend
 *    conserva la fecha anterior (nucleo-erp #777), y una orden reabierta no debe
 *    aparentar que ya terminó.
 *  - Entre dos estatus que no son `5`, no se toca.
 *
 * `current` es el estatus que muestra la ficha. La mutación sigue pendiente
 * hasta que el detalle se re-consulta (ver `useUpdateWorkOrder`), así que dos
 * cambios seguidos del mismo usuario no parten de un valor viejo. Un cambio de
 * OTRO usuario mientras la ficha está abierta sí puede dejarlo viejo; eso solo
 * lo cierra el backend, que es quien debe ser dueño de la regla (nucleo-erp
 * #777).
 *
 * Función PURA para poder probar cada caso sin React (ver `tests/unit`).
 */
export const buildWorkOrderStatusPayload = <F extends string>(
  field: F,
  current: WorkOrderStatus,
  next: WorkOrderStatus,
): Record<F, WorkOrderStatus> & { fecha_fin?: null } => {
  const payload = { [field]: next } as Record<F, WorkOrderStatus> & { fecha_fin?: null };
  if (current === COMPLETED_STATUS && next !== COMPLETED_STATUS) payload.fecha_fin = null;
  return payload;
};

/**
 * Mensaje del toast cuando falla el `PATCH` de una orden de trabajo.
 *
 * `drfActionErrorMessage` y no `extractErrorMessage`: el `400` de una orden
 * cancelada llega POR CAMPO (`{"estatus_reflejante": ["…"]}`), una forma que
 * `extractErrorMessage` no lee, y un `404` significa que la orden ya no existe
 * o salió del alcance del usuario.
 */
export const workOrderUpdateErrorMessage = (
  error: unknown,
  orderLabel: string,
): string =>
  drfActionErrorMessage(
    error,
    `No se pudo actualizar la ${orderLabel}`,
    `La ${orderLabel} ya no existe o no tienes acceso a ella.`,
  );
