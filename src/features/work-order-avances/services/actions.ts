import { v1_api } from "@/src/api/v1.api";
import type { WorkOrderAvance } from "../interfaces/work-order-avance.interface";

export const createWorkOrderAvance = async (
  endpoint: string,
  payload: Record<string, unknown>,
): Promise<WorkOrderAvance> => {
  const response = await v1_api.post<WorkOrderAvance>(endpoint, payload);
  return response.data;
};

export const deleteWorkOrderAvance = async (endpoint: string, id: number): Promise<void> => {
  await v1_api.delete(`${endpoint}${id}/`);
};
