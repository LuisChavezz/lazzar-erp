import { v1_api } from "@/src/api/v1.api";
import { Order } from "../interfaces/order.interface";


export const getOrders = async (): Promise<Order[]> => {
  const response = await v1_api.get<Order[]>("/ventas/pedidos/");
  return response.data;
}
