import { v1_api } from "@/src/api/v1.api";
import { Order } from "../../orders/interfaces/order.interface";


export const approveOrder = async (id: number): Promise<Order> => {
  const response = await v1_api.post<Order>(`/ventas/cotizaciones/${id}/autorizar/`);
  return response.data;
};

export const rejectOrder = async (id: number): Promise<Order> => {
  const response = await v1_api.post<Order>(`/ventas/cotizaciones/${id}/rechazar/`);
  return response.data;
};