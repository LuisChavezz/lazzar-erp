/**
 * Contrato de `/notificaciones/` (backend nucleo-erp).
 *
 * Autenticación por cookie JWT + `IsAuthenticated`. NINGUNO de estos endpoints
 * evalúa un `Permiso`, así que cualquier usuario autenticado lee y marca SUS
 * propias notificaciones.
 *
 * `GET /notificaciones/` devuelve un ARRAY PLANO, no un sobre paginado: no hay
 * `{count, next, previous, results}` en ninguna capa y tampoco parámetro de
 * límite —el corte a las N más recientes es del cliente—. Viene ordenado por
 * `created_at DESC`, pero SIN desempate por `id`: las filas se crean con
 * `bulk_create`, así que el orden entre timestamps idénticos no es
 * determinista. `?search=` y `?ordering=` los acepta DRF pero no hacen nada
 * (el ViewSet no declara `search_fields` ni `ordering_fields`).
 *
 * `empresa` y `usuario` NO se exponen: el backend ya filtra por el usuario de
 * la sesión.
 */

/** `modulo` de las notificaciones de cotizaciones. */
export const MODULO_VENTAS = "ventas";

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

/** Respuesta de `POST /notificaciones/marcar-todas-leidas/`. */
export interface MarcarTodasLeidasResponse {
  actualizadas: number;
}
