import { v1_api } from "@/src/api/v1.api";
import { Order, OrderCreate, OrderProductDetailCreate } from "../interfaces/order.interface";


export const getOrders = async (): Promise<Order[]> => {
  const response = await v1_api.get<Order[]>("/ventas/pedidos/");
  return response.data;
};

export const createOrder = async (order: OrderCreate): Promise<Order> => {
  const response = await v1_api.post<Order>("/ventas/pedidos/", order);
  return response.data;
};

export const updateOrder = async (order: Order): Promise<Order> => {
  const response = await v1_api.put<Order>(`/ventas/pedidos/${order.id}/`, order);
  return response.data;
};

export const getOrderProductDetails = async (): Promise<OrderProductDetailCreate[]> => {
  const response = await v1_api.get<OrderProductDetailCreate[]>(`/ventas/pedido-detalle/`);
  return response.data;
};

export const createOrderProductDetail = async (orderProductDetail: OrderProductDetailCreate): Promise<OrderProductDetailCreate> => {
  const response = await v1_api.post<OrderProductDetailCreate>("/ventas/pedido-detalle/", orderProductDetail);
  return response.data;
};