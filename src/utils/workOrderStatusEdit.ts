import { drfActionErrorMessage } from "./drfWriteErrors";

/**
 * Reglas de edición de estatus compartidas por las órdenes de trabajo de
 * reflejante y corte de manga (nucleo-erp #755). Sus enums son gemelos en forma
 * —1-7, `5` Completado, `7` Cancelado— y solo difieren en el nombre del campo
 * (`estatus_reflejante` / `estatus_corte`) y en la etiqueta del `3`, que cada
 * módulo resuelve con su propia config. Bordado NO entra aquí: su enum es otro
 * (1-8, terminales 7 y 8) y tiene su propio `embroideryStatusTransitions`.
 *
 * Lo que exige el `PATCH` del backend (nucleo-erp #786):
 *  - Solo producción: superusuario, admin de empresa o un rol del departamento
 *    PRODUCCION; el resto recibe `400 {"permiso": [...]}`. El frontend lo
 *    aproxima con el código `E-` de la sección (ver `hasProductionPermission`).
 *  - Una orden en `7` (Cancelado) ya no se edita: cualquier `PATCH` responde
 *    `400` en el campo de estatus.
 *
 * Fuera de eso no impone reglas de transición: acepta cualquier estatus. El
 * frontend tampoco las impone —mismo criterio que bordado—, con una sola
 * excepción: el `7` no se ofrece como DESTINO. Desde nucleo-erp#1355 el `PATCH`
 * ya no cancela (responde `400`): se cancela con motivo por `cancelar/`
 * ("Cancelar orden", EC-948, `isWorkOrderCancellable`). Cancelar es
 * irreversible y libera su cupo del pedido (#786).
 */

export type WorkOrderStatus = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const WORK_ORDER_STATUS_CODES: readonly WorkOrderStatus[] = [1, 2, 3, 4, 5, 6, 7];

/** Completado: el backend ya no lo cancela. */
const COMPLETED_STATUS: WorkOrderStatus = 5;

/** Cancelado: sin salida, y nunca ofrecido como destino. */
export const WORK_ORDER_CANCELLED_STATUS: WorkOrderStatus = 7;

const CANCELLED_STATUS = WORK_ORDER_CANCELLED_STATUS;

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
 * ¿Se ofrece "Cancelar orden"? (`POST {id}/cancelar/`, EC-948). Las mismas
 * reglas que el backend (`cancelar_orden_servicio`): ni cancelada, ni
 * Completada, ni dada de baja. El candado de una SM Enviada (OR) lo aplica el
 * backend y su `400` se muestra tal cual.
 */
export const isWorkOrderCancellable = (estatus: WorkOrderStatus, activo?: boolean): boolean =>
  activo !== false && estatus !== COMPLETED_STATUS && estatus !== CANCELLED_STATUS;

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
