import {
  EMBROIDERY_STATUS_CANCELLED,
  EMBROIDERY_STATUS_CODES,
  EMBROIDERY_STATUS_FINISHED,
} from "./embroideryStatus";
import type { EmbroideryOrderStatus } from "../interfaces/embroidery.interface";

/**
 * Transiciones de estatus de una orden de bordado (`estatus_bordado`, 1-8).
 *
 * El backend NO impone reglas de transición: su `PATCH` acepta cualquier valor
 * del enum, y el propio commit que lo reescribió lo declara "sin
 * automatización". El frontend TAMPOCO las impone ya: el flujo real de taller
 * no es una línea —una orden vuelve de Bordando a Arreglo, se reponcha, se
 * detiene y se retoma—, así que el mapa de saltos "válidos" que vivía aquí
 * describía un proceso que no existe. Desde cualquier estatus no terminal se
 * puede ir a cualquier otro.
 *
 * Lo único que queda restringido son los dos extremos:
 *
 *  - TERMINALES (7 Finalizado, 8 Cancelado): sin salida. La ficha entera
 *    pasa a solo lectura —ni estatus, ni máquina, ni observaciones, ni
 *    operador, ni avances— porque una orden cerrada no se retoca.
 *  - OCULTOS COMO DESTINO (8 Cancelado): desde nucleo-erp#1355 el `PATCH` ya no
 *    cancela (responde `400`); se cancela con motivo por `cancelar/` ("Cancelar
 *    orden", EC-948, `isEmbroideryOrderCancellable`). Se rotula y se pinta,
 *    pero el selector no lo ofrece.
 */

/** Estatus sin salida: la orden queda cerrada y la ficha, en solo lectura. */
const TERMINAL_STATUSES: ReadonlySet<EmbroideryOrderStatus> = new Set([
  EMBROIDERY_STATUS_FINISHED,
  EMBROIDERY_STATUS_CANCELLED,
]);

/**
 * Estatus que existen y se pintan, pero que el selector nunca ofrece como
 * DESTINO. Distinto de terminal: esto acota la lista de opciones, no la
 * editabilidad de la orden que ya está en ese estatus.
 */
const HIDDEN_DESTINATIONS: ReadonlySet<EmbroideryOrderStatus> = new Set([EMBROIDERY_STATUS_CANCELLED]);

/**
 * ¿La orden está en un estatus terminal?
 *
 * Es la fuente ÚNICA de esa pregunta: la ficha la usa para degradar sus campos
 * editables y `getAvailableTransitions` para quedarse sin destinos, de modo que
 * el selector y el resto del formulario no puedan discrepar.
 */
export const isTerminalStatus = (estatus: EmbroideryOrderStatus): boolean =>
  TERMINAL_STATUSES.has(estatus);

/**
 * Estatus a los que la orden puede saltar desde el suyo actual: todos los
 * demás, salvo los ocultos como destino. Vacío en un estatus terminal, que es
 * como el selector sabe que debe degradar a badge de solo lectura.
 */
export const getAvailableTransitions = (
  currentStatus: EmbroideryOrderStatus,
): EmbroideryOrderStatus[] => {
  if (isTerminalStatus(currentStatus)) return [];
  return EMBROIDERY_STATUS_CODES.filter(
    (estatus) => estatus !== currentStatus && !HIDDEN_DESTINATIONS.has(estatus),
  );
};

/**
 * ¿Se ofrece "Cancelar orden"? (`POST orden-bordado/{id}/cancelar/`, EC-948).
 * Las mismas reglas que el backend (`cancelar_orden_servicio`): ni cancelada,
 * ni Finalizada, ni dada de baja. El candado de una SM Enviada lo aplica el
 * backend y su `400` se muestra tal cual.
 */
export const isEmbroideryOrderCancellable = (
  order: { estatus_bordado: EmbroideryOrderStatus; activo?: boolean },
): boolean => order.activo !== false && !isTerminalStatus(order.estatus_bordado);
