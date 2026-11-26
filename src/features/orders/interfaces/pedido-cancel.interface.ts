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
 * responde 404. Con OC ligadas en borrador o por autorizar (nucleo-erp#1357,
 * EC-973) el 400 es `PedidoCancelBlockingOcsError`.
 *
 * La cancelación también cancela la pre-orden abierta del pedido y marca sus OC
 * autorizadas o parcialmente recibidas con `pedido_cancelado` (no las cancela):
 * lo reportan `pre_ordenes_canceladas` y `ordenes_compra_marcadas`.
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
  /**
   * Pre-órdenes del pedido que se cancelaron: sus necesidades pendientes se
   * cancelan (`necesidades_liberadas`) y las que ya estaban en una OC quedan
   * huérfanas (`necesidades_huerfanas`) para que compras decida.
   */
  pre_ordenes_canceladas: PedidoCancelPreOrdenCancelada[];
  /** OC autorizadas o parcialmente recibidas que quedaron con `pedido_cancelado`. */
  ordenes_compra_marcadas: PedidoCancelOcMarcada[];
}

export interface PedidoCancelPreOrdenCancelada {
  id: number;
  necesidades_liberadas: number;
  necesidades_huerfanas: number;
}

export interface PedidoCancelOcMarcada {
  id: number;
  /** `null` si la OC no tiene folio. */
  folio: string | null;
}

/** Una OC en borrador (1) o por autorizar (2) que impide cancelar el pedido. */
export interface PedidoCancelOcBloqueante {
  id: number;
  /** `null` si la OC no tiene folio (se nombra `#id`). */
  folio: string | null;
  /** 1 o 2; `null` si no llega como número (el aviso omite el badge). */
  estatus: number | null;
}

/**
 * Cuerpo del 400 de `cancelar/` con OC abiertas (EC-973): `ordenes_compra` es
 * el texto de siempre ("Tiene OC en borrador o por autorizar: OC-1, #2. …") y
 * `ordenes_compra_bloqueantes` la lista, ordenada por id, para ligar a cada OC.
 * No cambia nada: el pedido sigue igual.
 */
export interface PedidoCancelBlockingOcsError {
  ordenes_compra: string;
  ordenes_compra_bloqueantes: PedidoCancelOcBloqueante[];
}
