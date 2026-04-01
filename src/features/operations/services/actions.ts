import { v1_api } from "@/src/api/v1.api";
import { Quote } from "../../quotes/interfaces/quote.interface";


export const approveOrder = async (id: number): Promise<Quote> => {
  const response = await v1_api.post<Quote>(`/ventas/cotizaciones/${id}/autorizar/`);
  return response.data;
};

export const rejectOrder = async (id: number): Promise<Quote> => {
  const response = await v1_api.post<Quote>(`/ventas/cotizaciones/${id}/rechazar/`);
  return response.data;
};