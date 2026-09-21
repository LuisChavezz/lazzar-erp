import { v1_api } from "@/src/api/v1.api";
import { Size, SizeCreate } from "../interfaces/size.interface";


export const getSizes = async (): Promise<Size[]> => {
  const response = await v1_api.get<Size[]>("/catalogo/talla/");
  return response.data;
};

/**
 * Tallas activas permitidas para una categoría de producto
 * (`GET /catalogo/talla/?categoria_producto=<id>`). Sin categoría se pide el
 * catálogo completo.
 *
 * Función APARTE de `getSizes` a propósito: `useSizes` y el prefetch de
 * configuración la pasan como `queryFn` "desnuda", así que añadirle un parámetro
 * opcional recibiría el contexto de la query como si fuera la categoría.
 *
 * Ojo: el backend responde `200 []` tanto si la categoría no tiene tallas como
 * si no existe; ambos casos significan "sin opciones".
 */
export const getSizesByCategory = async (
  categoriaProductoId: number | null,
): Promise<Size[]> => {
  const response = await v1_api.get<Size[]>("/catalogo/talla/", {
    params: {
      ...(categoriaProductoId !== null && { categoria_producto: categoriaProductoId }),
    },
  });
  return response.data;
};

export const createSize =async (size: SizeCreate): Promise<Size> => {
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
