/**
 * Contrato de la programación de un pedido por Mesa de Control
 * (`PATCH /ventas/pedidos/{id}/programar/`).
 *
 * REEMPLAZO TOTAL e idempotente: la lista enviada sustituye por completo a la
 * guardada. Editar = reenviar la lista entera, incluidas las entradas que no
 * cambiaron; una lista vacía borra la programación.
 */
import type { PedidoProgramacionDestino } from "../constants/pedidoProgramacion";

/**
 * Una programación GUARDADA, tal como la devuelve `programacion_conf`.
 *
 * `destino` se tipa como `string` y no como `PedidoProgramacionDestino`: es un
 * `JSONField` y el tipo debe describir lo que puede traer, no lo que el
 * endpoint de escritura acepta hoy. Se estrecha con
 * `isPedidoProgramacionDestino`.
 *
 * `fecha`, `usuario_id` y `usuario_nombre` los SELLA EL SERVIDOR al guardar:
 * para el frontend son de solo lectura y nunca viajan en el payload.
 */
export interface PedidoProgramacion {
  destino: string;
  cantidad: number;
  fecha?: string;
  usuario_id?: number;
  usuario_nombre?: string;
}

/**
 * `Pedido.programacion_conf`. El modelo lo declara `JSONField(default=dict)`,
 * así que un pedido nunca programado trae `{}` (sin `programaciones`).
 */
export interface PedidoProgramacionConf {
  programaciones?: PedidoProgramacion[];
}

/** Una entrada del payload: SOLO `destino` + `cantidad`. */
export interface PedidoProgramacionInput {
  destino: PedidoProgramacionDestino;
  cantidad: number;
}

/** Cuerpo del PATCH. */
export interface PedidoProgramarPayload {
  programaciones: PedidoProgramacionInput[];
}

/**
 * Respuesta del PATCH. `total_piezas` es el total AUTORITATIVO del servidor
 * (suma de `PedidoDetalleTalla.cantidad`) y `programacion_conf` lo releído de
 * base de datos, ya con el sello de fecha/usuario.
 */
export interface PedidoProgramarResponse {
  pedido_id: number;
  total_piezas: number;
  programacion_conf: PedidoProgramacionConf;
}
