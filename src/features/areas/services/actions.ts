import { v1_api } from "@/src/api/v1.api";
import type { Area, AreaCreate } from "../interfaces/area.interface";

export const getAreas = async (): Promise<Area[]> => {
  const { data } = await v1_api.get<Area[]>("/hr/areas/");
  return data;
};

export const createArea = async (area: AreaCreate): Promise<Area> => {
  const { data } = await v1_api.post<Area>("/hr/areas/", area);
  return data;
};

export const updateArea = async (id: number, area: AreaCreate): Promise<Area> => {
  const { data } = await v1_api.put<Area>(`/hr/areas/${id}/`, area);
  return data;
};

export const deleteArea = async (id: number): Promise<void> => {
  await v1_api.delete(`/hr/areas/${id}/`);
};
