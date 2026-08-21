import { EMBROIDERY_STATUS_CODES } from "./embroideryStatus";
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
 *  - TERMINALES (7 Finalizado, 8 Cancelado legacy): sin salida. La ficha entera
 *    pasa a solo lectura —ni estatus, ni máquina, ni observaciones, ni
 *    operador, ni avances— porque una orden cerrada no se retoca.
 *  - OCULTOS COMO DESTINO (8 Cancelado legacy): el 8 es el desagüe del enum
 *    ANTERIOR —recoge lo que la migración `0030` remapeó desde el viejo 7
 *    "Cancelado"—, no un estatus al que se mande una orden hoy. Se rotula y se
 *    pinta (una OB que ya lo tiene se lee bien), pero no se ofrece.
 */

/** Estatus sin salida: la orden queda cerrada y la ficha, en solo lectura. */
const TERMINAL_STATUSES: ReadonlySet<EmbroideryOrderStatus> = new Set([7, 8]);

/**
 * Estatus que existen y se pintan, pero que el selector nunca ofrece como
 * DESTINO. Distinto de terminal: esto acota la lista de opciones, no la
 * editabilidad de la orden que ya está en ese estatus.
 */
const HIDDEN_DESTINATIONS: ReadonlySet<EmbroideryOrderStatus> = new Set([8]);

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
