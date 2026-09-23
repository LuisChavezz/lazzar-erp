import { v1_api } from "@/src/api/v1.api";
import { PedidoListItem, PedidoDetail } from "../interfaces/order.interface";
import type {
  PedidoMesaControlUpdate,
  PedidoMesaControlUpdateResponse,
} from "../interfaces/pedido-mesa-control.interface";
import type { PedidoMesaControlContexto } from "../interfaces/pedido-mesa-control-contexto.interface";
import type {
  PedidoProgramarPayload,
  PedidoProgramarResponse,
} from "../interfaces/pedido-programacion.interface";
import type { PedidoRecompraResponse } from "../interfaces/pedido-recompra.interface";
import type { PedidoHeaderUpdate } from "../interfaces/pedido-update.interface";


/** Filtros de query string aceptados por `GET /ventas/pedidos/`. */
export type OrdersQueryParams = Record<string, string>;

/**
 * Lista de pedidos. Sin `params` devuelve todos; con `{ mis_pedidos: "true" }`
 * el backend acota a los pedidos cuya cotización de origen creó el usuario
 * autenticado (`cotizacion.vendedor`).
 */
export const getOrders = async (params?: OrdersQueryParams): Promise<PedidoListItem[]> => {
  const response = await v1_api.get<PedidoListItem[]>("/ventas/pedidos/", { params });
  return response.data;
}

/**
 * Lee el detalle de UN pedido, con sus líneas producto+color y tallas
 * anidadas (`GET /ventas/pedidos/{id}/`). Funciona igual con o sin cotización
 * ligada. Primer consumidor: el "Ver detalle" del formulario de picking
 * (`PickingOrderDetailDialog`).
 */
export const getPedidoDetail = async (id: number): Promise<PedidoDetail> => {
  const response = await v1_api.get<PedidoDetail>(`/ventas/pedidos/${id}/`);
  return response.data;
};

/**
 * Edición parcial de la cabecera de un pedido (`PATCH /ventas/pedidos/{id}/`).
 * Manda SOLO las claves recibidas (ver `PedidoHeaderUpdate`).
 *
 * La respuesta NO se devuelve a propósito: es el detalle SIN el filtro de
 * campos contables que aplica el `GET`, así que usarla como caché mostraría
 * totales a quien no debe verlos. El hook invalida y vuelve a leer.
 */
export const updatePedidoHeader = async (
  id: number,
  payload: PedidoHeaderUpdate,
): Promise<void> => {
  await v1_api.patch(`/ventas/pedidos/${id}/`, payload);
};

/**
 * Edición de un pedido por Mesa de Control, espejada a su cotización de origen
 * (`POST /ventas/pedidos/{id}/editar-mesa-control/`).
 *
 * Una sola llamada atómica. Desde `ab63ce2` el guardado es un UPSERT por `id`,
 * no un borrado-y-recreado, pero el payload sigue llevando SIEMPRE el detalle
 * completo: omitir un renglón, talla o servicio extra existente no lo borra, lo
 * rechaza con 400.
 *
 * Respuestas de rechazo: 400 si el pedido no tiene cotización ligada o si falta
 * el ROL `MESA-DE-CONTROL`; **409** con el cuerpo del contexto si el pedido tiene
 * documentos ligados (factura emitida, órdenes activas, picking, reservas).
 */
/**
 * Precheck de la edición estricta
 * (`GET /ventas/pedidos/{id}/editar-mesa-control-contexto/`).
 *
 * Responde 200 tanto si el pedido es editable como si no; `editable` lo dice.
 * El MISMO cuerpo es el que devuelve el POST de edición con 409 cuando el
 * bloqueo aparece después de abrir la pantalla.
 */
export const getPedidoMesaControlContexto = async (
  id: number,
): Promise<PedidoMesaControlContexto> => {
  const response = await v1_api.get<PedidoMesaControlContexto>(
    `/ventas/pedidos/${id}/editar-mesa-control-contexto/`,
  );
  return response.data;
};

/**
 * Programación de un pedido por Mesa de Control
 * (`PATCH /ventas/pedidos/{id}/programar/`).
 *
 * REEMPLAZO TOTAL: `programaciones` sustituye a la lista guardada, así que se
 * manda completa. Solo `destino` + `cantidad`: la fecha y el usuario los sella
 * el servidor. 400 si la suma excede las piezas, un destino no está en la lista
 * blanca o falta el rol de mesa de control; 404 si el pedido no es visible para
 * la empresa del usuario. No hay 409: no toca renglones.
 */
export const programarPedido = async (
  id: number,
  payload: PedidoProgramarPayload,
): Promise<PedidoProgramarResponse> => {
  const response = await v1_api.patch<PedidoProgramarResponse>(
    `/ventas/pedidos/${id}/programar/`,
    payload,
  );
  return response.data;
};

/**
 * Recompra: clona el pedido en una cotización NUEVA en BORRADOR
 * (`POST /ventas/pedidos/{id}/recomprar/`). Sin cuerpo. Copia precios y totales
 * del pedido tal cual (no los recalcula) y no modifica el pedido.
 *
 * NO es idempotente: cada llamada crea otra cotización. 404 si el pedido no
 * existe, es de otra empresa o está dado de baja; un fallo de integridad llega
 * como 500 crudo. No hay errores de validación por campo.
 */
export const recomprarPedido = async (id: number): Promise<PedidoRecompraResponse> => {
  const response = await v1_api.post<PedidoRecompraResponse>(
    `/ventas/pedidos/${id}/recomprar/`,
  );
  return response.data;
};

export const updatePedidoMesaControl = async (
  id: number,
  payload: PedidoMesaControlUpdate,
): Promise<PedidoMesaControlUpdateResponse> => {
  const response = await v1_api.post<PedidoMesaControlUpdateResponse>(
    `/ventas/pedidos/${id}/editar-mesa-control/`,
    payload,
  );
  return response.data;
};
