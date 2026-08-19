import type { EmbroideryOrderStatus } from "../interfaces/embroidery.interface";

/**
 * Transiciones de estatus permitidas por el FRONTEND (`estatus_bordado`, 1-7).
 *
 * OJO: el backend NO impone reglas de transición — su `PATCH` acepta cualquier
 * entero 1-7. Este mapa es una restricción de PRODUCTO del frontend, para que
 * el selector de la ficha solo ofrezca los saltos que tienen sentido en el
 * flujo de bordado, no los siete estatus siempre.
 *
 *  1 Pendiente   → 2 Preparación · 7 Cancelado
 *  2 Preparación → 3 Bordando · 6 Detenido · 7 Cancelado
 *  3 Bordando    → 4 Revisión · 6 Detenido · 7 Cancelado
 *  4 Revisión    → 5 Completado · 6 Detenido · 7 Cancelado
 *  5 Completado  → (terminal)
 *  6 Detenido    → dinámico: reanudar al estatus previo · Cancelado
 *                  (su entrada del mapa es `[]`; la verdad está en
 *                  `getAvailableTransitions`)
 *  7 Cancelado   → (terminal)
 */
export const EMBROIDERY_STATUS_TRANSITIONS: Record<
  EmbroideryOrderStatus,
  EmbroideryOrderStatus[]
> = {
  1: [2, 7],
  2: [3, 6, 7],
  3: [4, 6, 7],
  4: [5, 6, 7],
  5: [],
  6: [],
  7: [],
};

/**
 * Estatus "Detenido": el ÚNICO cuyas transiciones no salen del mapa de arriba.
 * Su entrada figura como `[]` porque el destino de reanudación depende del
 * estatus previo, que solo se conoce en tiempo de ejecución. Quien necesite las
 * transiciones de una orden debe llamar SIEMPRE a `getAvailableTransitions`,
 * nunca leer el mapa directamente: para el 6 daría la respuesta equivocada.
 */
const DETENIDO: EmbroideryOrderStatus = 6;

/**
 * Estatus al que reanuda una orden detenida cuando NO se conoce su estatus
 * previo. Es el primer estatus "en proceso" del flujo, un default seguro.
 */
const RESUME_DEFAULT: EmbroideryOrderStatus = 2;

/** Cancelado, ofrecido desde todo estatus no terminal — Detenido incluido. */
const CANCELADO: EmbroideryOrderStatus = 7;

/**
 * Estatus a los que la orden puede saltar desde su estatus actual.
 *
 * El único caso dinámico es 6 (Detenido), donde se ofrecen DOS salidas:
 * reanudar (volver al estatus en el que estaba antes de detenerse) y cancelar.
 * Cancelar estaba ausente y era una omisión, no una regla: obligaba a reanudar
 * una orden muerta solo para poder cancelarla, y dejaba a Detenido como el
 * único estatus no terminal sin salida a Cancelado.
 *
 * TODO: el backend NO expone hoy el estatus previo a Detenido (el retrieve no
 * trae `estatus_anterior` ni un log de historial), así que `previousStatus`
 * llega `undefined` y se reanuda a 2 (Preparación) como default seguro. Cuando
 * el backend exponga ese dato, pasarlo aquí para reanudar al estatus real.
 */
export const getAvailableTransitions = (
  currentStatus: EmbroideryOrderStatus,
  previousStatus?: EmbroideryOrderStatus,
): EmbroideryOrderStatus[] => {
  if (currentStatus === DETENIDO) {
    return [previousStatus ?? RESUME_DEFAULT, CANCELADO];
  }
  return EMBROIDERY_STATUS_TRANSITIONS[currentStatus] ?? [];
};
