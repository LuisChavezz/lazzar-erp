import { v1_api } from "@/src/api/v1.api";
import { Size, SizeCreate } from "../interfaces/size.interface";


export const getSizes = async (): Promise<Size[]> => {
  const response = await v1_api.get<Size[]>("/catalogo/talla/");
  return response.data;
};

export const createSize = async (size: SizeCreate): Promise<Size> => {
  const response = await v1_api.post<Size>("/catalogo/talla/", size);
  return response.data;
};

export const updateSize = async (id: number, size: SizeCreate): Promise<Size> => {
  const response = await v1_api.put<Size>(`/catalogo/talla/${id}/`, size);
  return response.data;
};

export const deleteSize = async (id: number): Promise<void> => {
  await v1_api.delete(`/catalogo/talla/${id}/`);
};
