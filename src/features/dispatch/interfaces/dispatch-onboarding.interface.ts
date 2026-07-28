/**
 * Contratos del endpoint de onboarding de despacho
 * (`GET /wms/despachos/onboarding/`).
 *
 * El endpoint tiene DOS modos según el query param opcional `?packing`:
 *
 *  - SIN `?packing` → solo el catálogo de packings candidatos (`packings`),
 *    con `packing: null` y `despacho_detalle: []`. El backend limita el
 *    catálogo a 50 resultados (orden `-created_at, -id`), SIN paginar ni
 *    filtrar por texto — por eso el selector es un buscador en memoria
 *    (`SearchableSelectList`), no un `FormSelect` plano. Mismo tope y mismo
 *    criterio que el onboarding de packing.
 *
 *  - CON `?packing={id}` → los mismos candidatos MÁS `packing` (el elegido,
 *    con el shape del catálogo MÁS `cliente`) y `despacho_detalle`: una fila
 *    por línea de `PackingDetalle` con su elegibilidad de despacho ACTUAL.
 *    Esa elegibilidad puede cambiar entre que se carga el formulario y se
 *    envía (otro operador despacha la misma línea antes), así que no debe
 *    cachearse por mucho — ver `useDispatchOnboarding`.
 *
 * OJO con el id que se manda en `?packing`: un id inexistente o fuera del
 * alcance del usuario devuelve `400` (no `404`), y un valor NO numérico
 * revienta el endpoint con un `500` sin capturar (bug confirmado del backend).
 * Por eso la acción valida que el id sea un entero positivo antes de pedir
 * (ver `getDispatchOnboarding`).
 *
 * Los nombres de campo se conservan en español, tal cual el contrato del API.
 */

/**
 * Packing candidato a despachar, tal cual aparece en el catálogo. A
 * diferencia del packing YA elegido, el catálogo NO trae `cliente` (id), solo
 * `cliente_nombre`.
 */
export interface DispatchOnboardingPacking {
  id: number;
  folio: string;
  pedido: number;
  pedido_folio: string | null;
  cliente_nombre: string | null;
  sucursal: number;
  sucursal_nombre: string | null;
  picking: number;
  picking_folio: string | null;
  almacen: number;
  almacen_nombre: string | null;
  estado: string;
}

/**
 * El packing elegido (`?packing={id}`) — mismo shape que el catálogo MÁS
 * `cliente` (id), que el catálogo por sí solo no incluye.
 */
export interface DispatchOnboardingPackingDetail extends DispatchOnboardingPacking {
  cliente: number | null;
}

/**
 * Envío candidato del pedido del packing elegido.
 *
 * Se tipa por completitud del contrato pero NINGÚN componente lo consume: hoy
 * no existe forma de crear un `Envio` fuera del admin de Django, así que este
 * arreglo llega casi siempre vacío y un selector de envío se leería como algo
 * roto en lugar de comunicar la limitación real. `Despacho.envio` es nullable
 * desde la migración `0010_alter_despacho_envio`, así que el POST simplemente
 * omite el campo (ver `CreateDispatchPayload`).
 *
 * `transportista_nombre` siempre viaja `null`: `Transportista` no tiene campo
 * de nombre en el modelo actual — mismo hueco ya documentado en `Dispatch`.
 */
export interface DispatchOnboardingEnvio {
  id: number;
  pedido: number;
  transportista: number;
  transportista_nombre: string | null;
}

/**
 * Línea candidata a despachar del packing elegido — una por cada línea de
 * `PackingDetalle`, esté ya despachada o no.
 *
 * NO hay aritmética de pendientes aquí (a diferencia de
 * `PackingOnboardingLine.cantidad_pendiente_empacar`): despachar es BINARIO
 * por línea. `ya_despachado` marca que la línea ya se consumió en un despacho
 * previo y `disponible_para_despacho` es su complemento (`!ya_despachado`).
 * `cantidad_empacada` viaja solo como contexto informativo — no se captura ni
 * se envía cantidad alguna (el modelo `DespachoDetalle` no tiene ese campo).
 *
 * OJO con `talla`/`color`: en ESTA respuesta son los ids resueltos y SIEMPRE
 * vienen como clave (con `null` explícito cuando no aplica). No confundir con
 * `talla_id`/`color_id` de `DispatchDetalleLine` (listado/detalle), que pueden
 * faltar por completo — son shapes distintos del mismo dato, con nombres de
 * campo distintos según el endpoint.
 */
export interface DispatchOnboardingLine {
  packing_detalle: number;
  picking_detalle: number | null;
  pedido_detalle: number | null;
  pedido_detalle_talla: number | null;
  producto: number | null;
  producto_nombre: string | null;
  producto_variante: number | null;
  producto_variante_nombre: string | null;
  talla: number | null;
  talla_nombre: string | null;
  color: number | null;
  color_nombre: string | null;
  ubicacion: number | null;
  ubicacion_nombre: string | null;
  caja: number | null;
  caja_numero: number | null;
  cantidad_empacada: string;
  estado: string;
  ya_despachado: boolean;
  disponible_para_despacho: boolean;
}

/**
 * Respuesta completa del onboarding. `packing` solo viene poblado cuando se
 * llamó con `?packing={id}`; en el modo "solo catálogo" es `null` y
 * `despacho_detalle` es `[]`.
 *
 * `despacho_detalle` aquí son las líneas CANDIDATAS (shape de lectura,
 * `DispatchOnboardingLine`), no las líneas a enviar en el POST
 * (`CreateDispatchDetalleLine`, solo `{ packing_detalle }`) ni las ya
 * registradas (`DispatchDetalleLine`, con `id`/`despacho`). Los tres shapes
 * comparten el nombre `despacho_detalle` en sus respectivos endpoints — misma
 * colisión de nombres que ya tiene `packing_detalle` en packing.
 */
export interface DispatchOnboardingData {
  packings: DispatchOnboardingPacking[];
  envios: DispatchOnboardingEnvio[];
  packing: DispatchOnboardingPackingDetail | null;
  despacho_detalle: DispatchOnboardingLine[];
}
