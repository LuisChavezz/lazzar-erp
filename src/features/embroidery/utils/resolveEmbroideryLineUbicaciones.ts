import type {
  EmbroideryOnboardingUbicacion,
  EmbroideryOrderDetailLine,
} from "../interfaces/embroidery.interface";

/**
 * Las ubicaciones que debe pintar el DETALLE de una orden de bordado.
 *
 * El `retrieve` expone DOS fuentes de la misma información, y no son
 * intercambiables:
 *
 *  - `configuracion` — el `bordado_config` congelado al crear la orden
 *    (`OrdenBordadoDetalle.configuracion`, migración `0027`).
 *  - `ubicaciones` — un `SerializerMethodField` que RE-LEE la
 *    `PedidoDetalleTalla` por `(pedido_detalle_id, talla_id)` y devuelve lo que
 *    el pedido dice HOY.
 *
 * Se prefiere `configuracion` porque una orden de bordado es un DOCUMENTO: debe
 * mostrar lo que se mandó a producción cuando se emitió, no lo que la
 * cotización diga después. Con la fuente en vivo, editar el `bordado_config`
 * del pedido reescribiría en silencio el contenido de órdenes ya emitidas —y el
 * taller estaría bordando contra el papel viejo—.
 *
 * Se cae a `ubicaciones` cuando `configuracion` es `null`, que es el caso de
 * TODAS las órdenes anteriores a la migración (no se hizo backfill). Ahí la
 * lectura en vivo es lo único que hay, y es exactamente lo que este diálogo ya
 * mostraba, así que el respaldo no introduce ninguna regresión.
 *
 * No hay riesgo de mezclar formas: ambas salen del mismo `bordado_config`, así
 * que sus elementos son el mismo `EmbroideryOnboardingUbicacion`. La diferencia
 * es de MOMENTO, no de shape.
 *
 * Devuelve siempre un arreglo —nunca `null`—, posiblemente vacío: hay una
 * `PedidoDetalleTalla` real con `lleva_bordado` y `ubicaciones: []`, y una
 * `configuracion` sin la clave es igual de posible al ser JSON libre.
 */
export function resolveEmbroideryLineUbicaciones(
  linea: EmbroideryOrderDetailLine,
): EmbroideryOnboardingUbicacion[] {
  const snapshot = linea.configuracion?.ubicaciones;
  // `Array.isArray` y no un simple `??`: `configuracion` es JSON libre, así que
  // la clave puede llegar con cualquier valor. Un `{"ubicaciones": {...}}` se
  // trataría como arreglo y reventaría al mapearlo.
  if (Array.isArray(snapshot)) return snapshot;
  return linea.ubicaciones ?? [];
}
