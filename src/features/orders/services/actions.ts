import { v1_api } from "@/src/api/v1.api";
import { Order, PedidoDetail } from "../interfaces/order.interface";


export const getOrders = async (): Promise<Order[]> => {
  const response = await v1_api.get<Order[]>("/ventas/pedidos/");
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
