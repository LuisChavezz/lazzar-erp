import { v1_api } from "@/src/api/v1.api";
import { PedidoListItem, PedidoDetail } from "../interfaces/order.interface";
import type {
  PedidoMesaControlUpdate,
  PedidoMesaControlUpdateResponse,
} from "../interfaces/pedido-mesa-control.interface";
import type { PedidoMesaControlContexto } from "../interfaces/pedido-mesa-control-contexto.interface";


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
