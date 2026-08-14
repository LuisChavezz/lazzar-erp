import { v1_api } from "@/src/api/v1.api";
import type { Position, PositionPayload } from "../interfaces/position.interface";

export const getPositions = async (): Promise<Position[]> => {
  const { data } = await v1_api.get<Position[]>("/hr/puestos/");
  return data;
};

export const createPosition = async (position: PositionPayload): Promise<Position> => {
  const { data } = await v1_api.post<Position>("/hr/puestos/", position);
  return data;
};

export const updatePosition = async (
  id: number,
  position: PositionPayload
): Promise<Position> => {
  const { data } = await v1_api.put<Position>(`/hr/puestos/${id}/`, position);
  return data;
};

export const deletePosition = async (id: number): Promise<void> => {
  await v1_api.delete(`/hr/puestos/${id}/`);
};
