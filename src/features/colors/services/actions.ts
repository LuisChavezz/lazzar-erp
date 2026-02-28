import { v1_api } from "@/src/api/v1.api";
import type { Color, ColorCreate } from "../interfaces/color.interface";


export const getColors = async (): Promise<Color[]> => {
  const { data } = await v1_api.get<Color[]>("/catalogo/color");
  return data;
};

export const createColor = async (color: ColorCreate): Promise<Color> => {
  const { data } = await v1_api.post<Color>("/catalogo/color/", color);
  return data;
};

export const updateColor = async (id: number, color: ColorCreate): Promise<Color> => {
  const { data } = await v1_api.put<Color>(`/catalogo/color/${id}/`, color);
  return data;
};

export const deleteColor = async (id: number): Promise<void> => {
  await v1_api.delete(`/catalogo/color/${id}/`);
};