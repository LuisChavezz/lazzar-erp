import { v1_api } from "@/src/api/v1.api";
import { PedidoListItem, PedidoDetail } from "../interfaces/order.interface";


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
