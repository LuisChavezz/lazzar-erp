import type {
  ReflectiveLineConfigEntry,
  ReflectiveOrderDetailLine,
} from "../interfaces/reflective-order.interface";

/**
 * Los reflejantes que debe pintar el DETALLE de una orden.
 *
 * El `retrieve` expone DOS fuentes del mismo dato, y no son intercambiables —
 * mismo reparto que `resolveEmbroideryLineUbicaciones` en bordado:
 *
 *  - `configuracion` — el `reflejante_config` CONGELADO al emitir la orden
 *    (`OrdenReflejanteDetalle.configuracion`, migración `0027`).
 *  - `reflejante_config` — un `SerializerMethodField` que RE-LEE la
 *    `PedidoDetalleTalla` y devuelve lo que el pedido dice HOY.
 *
 * Se prefiere `configuracion` porque una orden es un DOCUMENTO: debe mostrar lo
 * que se mandó a producción al emitirla, no lo que la cotización edite después.
 * Se cae a la lectura en vivo solo cuando `configuracion` es `null` (órdenes
 * anteriores a la migración, sin backfill) — ahí es lo único que hay, y es
 * exactamente lo que el detalle mostraría de todas formas.
 *
 * ── Por qué NO se comparte con la de bordado ────────────────────────────────
 * El acceso NO tiene la misma forma. En bordado `configuracion` es un OBJETO
 * `{notas, ubicaciones}` del que hay que SACAR `.ubicaciones`; aquí el config ES
 * el arreglo directamente (`reflejante_config` de `PedidoDetalleTalla` es una
 * lista, no un dict). Esa discordancia lista-vs-objeto ya causó tres bugs en
 * este proyecto, así que cada módulo resuelve con su propio acceso en vez de
 * forzar un helper genérico que tenga que ramificar por forma.
 *
 * Devuelve SIEMPRE un arreglo (nunca `null`), posiblemente vacío: `Array.isArray`
 * y no un `??` porque ambos campos son JSON libre y podrían llegar con cualquier
 * valor; un objeto suelto se trataría como arreglo y reventaría al mapearlo.
 */
export function resolveReflectiveLineConfigs(
  linea: ReflectiveOrderDetailLine,
): ReflectiveLineConfigEntry[] {
  if (Array.isArray(linea.configuracion)) return linea.configuracion;
  if (Array.isArray(linea.reflejante_config)) return linea.reflejante_config;
  return [];
}
