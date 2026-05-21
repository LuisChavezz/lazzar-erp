import { v1_api } from "@/src/api/v1.api";
import { OperationsQuote } from "../interfaces/operations-quote.interface";

export const getOperationsQuotes = async (): Promise<OperationsQuote[]> => {
  const response = await v1_api.get<OperationsQuote[]>("/ventas/mesa-control/");
  return response.data;
};

export const approveOperationsQuote = async (
  id: number
): Promise<OperationsQuote> => {
  const response = await v1_api.post<OperationsQuote>(
    `/ventas/mesa-control/${id}/autorizar/`
  );
  return response.data;
};

export const rejectOperationsQuote = async (
  id: number
): Promise<OperationsQuote> => {
  const response = await v1_api.post<OperationsQuote>(
    `/ventas/mesa-control/${id}/rechazar/`
  );
  return response.data;
};