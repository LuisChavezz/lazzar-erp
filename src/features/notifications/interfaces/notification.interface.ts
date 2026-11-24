/**
 * Contrato de `/notificaciones/` (backend nucleo-erp).
 *
 * Autenticación por cookie JWT + `IsAuthenticated`. NINGUNO de estos endpoints
 * evalúa un `Permiso`, así que cualquier usuario autenticado lee y marca SUS
 * propias notificaciones (el único alcance es `usuario`: un usuario con varias
 * empresas ve las de todas).
 *
 * `GET /notificaciones/` sin `?limit=` devuelve un ARRAY PLANO con el
 * historial completo; con `?limit=` (tope 500) y `?offset=` devuelve
 * `{count, next, previous, results}`, y un `limit`/`offset` inválido responde
 * 400. Filtros: `?leido=true|false|1|0` y `?modulo=` (sin distinguir
 * mayúsculas). Viene ordenado por `created_at DESC`, pero SIN desempate por
 * `id`. Con ese orden los empates son improbables (cada fila toma su propio
 * `created_at` con microsegundos), pero con `?ordering=` sobre campos de pocos
 * valores (`leido`, `modulo`, `tipo`, `leido_at`) son comunes y el orden
 * entre ellos no es determinista (nucleo-erp#1345). `?ordering=` SÍ aplica (el
 * `OrderingFilter` global de DRF; la vista no declara `ordering_fields`)
 * sobre los campos del serializer: `id`, `titulo`, `mensaje`, `modulo`,
 * `tipo`, `leido`, `leido_at`, `data` y `created_at`, con `-` para
 * descendente. REEMPLAZA el orden por defecto, tampoco agrega desempate por
 * `id`, y un campo fuera de esa lista se ignora sin error (queda el
 * `created_at DESC`). `?search=` lo acepta pero no hace nada (la vista no
 * declara `search_fields`). El cliente usa hoy la forma sin `?limit=` ni
 * `?ordering=` (`getNotificaciones`) y corta a las N más recientes por su
 * cuenta.
 *
 * `GET /notificaciones/stream/` (SSE) ya no existe (nucleo-erp #1315); la
 * campana sondea `sin-leer/count/` (EC-555).
 *
 * `empresa` y `usuario` NO se exponen: el backend ya filtra por el usuario de
 * la sesión. `data.url`, cuando viene, es una ruta del BACKEND
 * (`/compras/ordenes/12`, `/rh/vacaciones/3`) que no existe en el front: nunca
 * se navega a ella (ver `constants/notificationTargets.ts`).
 */

/*
  `tipo` que el frontend sabe abrir (ver `constants/notificationTargets.ts`).
  NO es el catálogo del backend: el modelo no tiene `choices`, y cualquier otro
  `tipo` se pinta igual, solo que sin destino.
*/

/** Cotización enviada a revisión. Destinatarios: rol MESA-DE-CONTROL. */
export const TIPO_COTIZACION_EN_REVISION = "cotizacion_en_revision";

/**
 * Cotización autorizada por mesa de control. Destinatario: su vendedor.
 * `data: { cotizacion_id, pedido_id, pedido_folio }` (`pedido_folio` nullable).
 */
export const TIPO_COTIZACION_AUTORIZADA = "cotizacion_autorizada";

/**
 * Cotización rechazada por mesa de control. Destinatario: su vendedor.
 * `data: { cotizacion_id, motivo }`; el motivo también va en `mensaje`.
 */
export const TIPO_COTIZACION_RECHAZADA = "cotizacion_rechazada";

/**
 * OC autorizada (`aceptar/`), para el departamento WMS (Almacén), que la
 * recibirá. `modulo: "compras"`. `data: { orden_compra_id, folio,
 * proveedor_nombre, sucursal_id, fecha_entrega_estimada, url }`.
 */
export const TIPO_OC_AUTORIZADA = "oc_autorizada";

/**
 * Avisos de solicitudes de RH (`modulo: "rh"`), `<clave>_<evento>` con clave
 * `vacaciones` o `permiso_ausencia`. `_solicitada` va al departamento RH;
 * `_aprobado`/`_rechazado`, solo a quien capturó la solicitud
 * (`solicitado_por`). `data: { solicitud_id, tipo_solicitud, empleado_id,
 * empleado_nombre, fecha_inicio, fecha_fin, url }`, más `estado` en la
 * resolución y `motivo_rechazo` solo en el rechazo.
 */
export const TIPO_VACACIONES_SOLICITADA = "vacaciones_solicitada";
export const TIPO_VACACIONES_APROBADO = "vacaciones_aprobado";
export const TIPO_VACACIONES_RECHAZADO = "vacaciones_rechazado";
export const TIPO_PERMISO_AUSENCIA_SOLICITADA = "permiso_ausencia_solicitada";
export const TIPO_PERMISO_AUSENCIA_APROBADO = "permiso_ausencia_aprobado";
export const TIPO_PERMISO_AUSENCIA_RECHAZADO = "permiso_ausencia_rechazado";

/**
 * OC de faltantes de una pre-orden autorizada, para Producción. Entra por la
 * regla de prefijo `pre_orden_`. `data: { pre_orden, pedido, origen, url }`.
 */
export const TIPO_PRE_ORDEN_OC_AUTORIZADA = "pre_orden_oc_autorizada";

export interface Notificacion {
  id: number;
  titulo: string;
  mensaje: string;
  /**
   * Módulo emisor. `string` y NO una unión: el modelo no tiene `choices` ni hay
   * catálogo, así que un valor nuevo debe renderizarse sin romper el tipado.
   */
  modulo: string;
  /** Tipo de evento. `string` por la misma razón que `modulo`. */
  tipo: string;
  leido: boolean;
  /** ISO 8601 con offset, o `null` mientras no se marque leída. */
  leido_at: string | null;
  /**
   * `JSONField` SIN validación de servidor: su forma no está garantizada por
   * contrato. Se tipa `unknown` —el mismo criterio que `configuracion` en
   * `corte-manga` y `corte_manga_config` en `orders`— para obligar a estrechar
   * por `tipo` en el punto de uso (ver `constants/notificationTargets.ts`) en
   * vez de confiar en una forma que el backend no impone.
   */
  data: unknown;
  /** ISO 8601. Criterio de orden del listado. */
  created_at: string;
}

/**
 * Respuesta de `GET /notificaciones/sin-leer/count/`. Ambos campos cuentan
 * solo las NO leídas del usuario de la sesión.
 */
export interface NotificacionesSinLeer {
  count: number;
  /**
   * `id` máximo entre las no leídas; `0` sin ninguna. Los `id` solo crecen,
   * así que una notificación nueva siempre lo sube, y marcar como leída solo
   * puede bajarlo.
   */
  ultima_notificacion_id: number;
}

/** Respuesta de `POST /notificaciones/marcar-todas-leidas/`. */
export interface MarcarTodasLeidasResponse {
  actualizadas: number;
}
