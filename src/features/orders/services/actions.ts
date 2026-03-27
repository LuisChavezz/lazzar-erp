import { v1_api } from "@/src/api/v1.api";
import { Order, OrderById, OrderCreate, OrderOnboardingData } from "../interfaces/order.interface";


export const getOrders = async (): Promise<Order[]> => {
  const response = await v1_api.get<Order[]>("/ventas/cotizaciones/");
  return response.data;
};

export const getOrderById = async (id: number): Promise<OrderById> => {
  const response = await v1_api.get<OrderById>(`/ventas/cotizaciones/${id}/`);
  return response.data;
};

export const createOrder = async (order: OrderCreate): Promise<OrderCreate> => {
  const response = await v1_api.post<OrderCreate>("/ventas/cotizaciones/onboarding/", order);
  return response.data;
};

export const getOrderOnboardingData = async (): Promise<OrderOnboardingData> => {
  const response = await v1_api.get<OrderOnboardingData>("/ventas/cotizaciones/onboarding/");
  return response.data;
};
