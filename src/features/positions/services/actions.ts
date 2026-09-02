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

/**
 * Edición parcial: PATCH, nunca PUT.
 *
 * Hoy el payload cubre casi todo `Puesto` y solo omite `activo`, pero con PUT
 * cualquier campo que el backend agregue y este frontend no administre se
 * vaciaría en silencio en cada edición. Con PATCH lo ausente se conserva.
 * Mismo criterio que en empleados y áreas.
 */
export const updatePosition = async (
  id: number,
  position: PositionPayload
): Promise<Position> => {
  const { data } = await v1_api.patch<Position>(`/hr/puestos/${id}/`, position);
  return data;
};

export const deletePosition = async (id: number): Promise<void> => {
  await v1_api.delete(`/hr/puestos/${id}/`);
};
