import type { PedidoRetencion } from "./order.interface";

/**
 * Cuerpo de `POST /ventas/pedidos/{id}/retener/`. El motivo es OBLIGATORIO: el
 * backend lo recorta (`strip()`) y lo trunca en silencio a 500 caracteres; en
 * blanco responde 400 `{"motivo": "Indica el motivo de la retención."}`.
 */
export interface PedidoRetenerPayload {
  motivo: string;
}

/**
 * Respuesta 200 de `retener/` y de `liberar/` (nucleo-erp#1352, #1369): el
 * estado de retención como quedó. Tras liberar, `retenido: false`,
 * `motivo_retencion: ""` y los otros tres `null`.
 *
 * Rechazos, todos sin cambio: 400 `{"motivo": …}` (retener sin motivo), 400
 * `{"pedido": …}` (ya retenido / no retenido), 400 `{"permiso": …}` si el
 * usuario no es Mesa de Control (llega como 400, no 403) y 404 si el pedido es
 * de otra empresa o sucursal, o está cancelado (`activo = false`).
 */
export interface PedidoRetencionResponse extends PedidoRetencion {
  id: number;
  folio: string | null;
}
