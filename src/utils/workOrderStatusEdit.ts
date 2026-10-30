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
 * DESTINO. Cancelar es irreversible: una orden en `7` responde `400` a
 * cualquier `PATCH`. Desde nucleo-erp #786 sí libera su cupo del pedido (sus
 * piezas dejan de contar como programadas), pero ofrecerlo es una decisión de
 * negocio aparte.
 */

export type WorkOrderStatus = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const WORK_ORDER_STATUS_CODES: readonly WorkOrderStatus[] = [1, 2, 3, 4, 5, 6, 7];

/** Cancelado: sin salida, y nunca ofrecido como destino. */
const CANCELLED_STATUS: WorkOrderStatus = 7;

/**
 * Las únicas prioridades que ofrece el selector de la ficha (1 Alta, 2 Media,
 * 3 Baja). Son también las únicas que acepta el `PATCH` del backend
 * (nucleo-erp #786); cualquier otro entero responde `400`.
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
