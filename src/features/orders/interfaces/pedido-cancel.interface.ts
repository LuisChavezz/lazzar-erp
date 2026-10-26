import type { PEDIDO_ESTATUS } from "../constants/pedidoStatus";

/**
 * Respuesta 200 de `POST /ventas/pedidos/{id}/cancelar/` (sin cuerpo).
 *
 * Cancelar deja `estatus = 5` y `activo = false`: el pedido deja de listarse y
 * su detalle (`GET /ventas/pedidos/{id}/`) responde 404 desde ese momento.
 *
 * Rechazos, todos 400 y sin ningún cambio: `{"permiso": "…"}` si el usuario no
 * es mesa de control (llega como 400, no 403), `{"pedido": "Tiene documentos
 * vivos: …"}` si hay picking, packing, factura u órdenes de trabajo sin
 * cancelar.
 */
export interface PedidoCancelResponse {
  id: number;
  estatus: typeof PEDIDO_ESTATUS.CANCELADO;
  activo: false;
}
