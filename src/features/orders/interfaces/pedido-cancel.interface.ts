import type { PEDIDO_ESTATUS } from "../constants/pedidoStatus";

/**
 * Cuerpo de `POST /ventas/pedidos/{id}/cancelar/`. El motivo es OBLIGATORIO:
 * el backend lo recorta (`strip()`) y, en blanco o ausente, responde 400 con
 * `{"motivo": "Indica el motivo de la cancelación."}`. Lo guarda en la
 * auditoría de la cancelación y lo trunca EN SILENCIO a 500 caracteres
 * (`PEDIDO_CANCEL_MOTIVO_MAX`).
 */
export interface PedidoCancelPayload {
  motivo: string;
}

/** Un renglón de lo que la cancelación devolvió al inventario. */
export interface PedidoCancelInventarioDevuelto {
  producto_id: number;
  producto_variante_id: number | null;
  /** Decimal en string (4 decimales, la resolución del inventario). */
  cantidad: string;
}

/**
 * Respuesta 200 de `POST /ventas/pedidos/{id}/cancelar/`.
 *
 * En una sola transacción el backend deja `estatus = 5` y `activo = false`:
 * el pedido deja de listarse y su
 * detalle (`GET /ventas/pedidos/{id}/`) responde 404 desde ese momento.
 *
 * Rechazos, todos 400 y sin ningún cambio: `{"motivo": "…"}` si falta,
 * `{"permiso": "…"}` si el usuario no es mesa de control (llega como 400, no
 * 403) y `{"pedido": "…"}` si ya está cancelado o tiene picking, packing,
 * factura u órdenes de trabajo sin cancelar. Un pedido ya dado de baja
 * responde 404.
 */
export interface PedidoCancelResponse {
  id: number;
  /** `null` en el modelo (`Pedido.folio`), aunque todo pedido nace con folio. */
  folio: string | null;
  estatus: typeof PEDIDO_ESTATUS.CANCELADO;
  activo: false;
  /** El motivo tal como quedó guardado (recortado). */
  motivo: string;
  /** Lo que el backend reporta como devuelto; lo resume `pedidoCancelSummary`. */
  inventario_devuelto: PedidoCancelInventarioDevuelto[];
  /** Cuántas reservas ACTIVA pasaron a LIBERADA. */
  reservas_liberadas: number;
}
