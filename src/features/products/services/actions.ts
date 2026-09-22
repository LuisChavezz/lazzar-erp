import { v1_api } from "@/src/api/v1.api";
import { Product, ProductCreate } from "../interfaces/product.interface";


/**
 * `tipo_id` acepta uno o VARIOS tipos. Una lista viaja en forma de comas
 * (`?tipo_id=1,3`), que el backend acepta igual que el parámetro repetido; no se
 * pasa el arreglo tal cual porque axios lo serializaría como `tipo_id[]=1&...`,
 * clave que el backend no lee (filtraría nada y devolvería todos los tipos).
 */
export const getProducts = async (
  tipo_id?: number | string | readonly number[],
): Promise<Product[]> => {
  const response = await v1_api.get<Product[]>("/catalogo/producto/", {
    params: {
      ...(tipo_id !== undefined && {
        tipo_id: Array.isArray(tipo_id) ? tipo_id.join(",") : tipo_id,
      }),
    },
  });
  return response.data;
};

/**
 * Detalle de un producto. El backend acota el `retrieve` por empresa igual que
 * el listado (`_alcance_empresa`): un producto ajeno responde 404. No aplica
 * filtro de tipo ni de `activo`.
 */
export const getProduct = async (id: number): Promise<Product> => {
  const response = await v1_api.get<Product>(`/catalogo/producto/${id}/`);
  return response.data;
};

export const createProduct = async (product: ProductCreate): Promise<Product> => {
  const response = await v1_api.post<Product>("/catalogo/producto/", product);
  return response.data;
};

export const updateProduct = async (id: number, product: ProductCreate): Promise<Product> => {
  const response = await v1_api.put<Product>(`/catalogo/producto/${id}/`, product);
  return response.data;
}

export const deleteProduct = async (id: number): Promise<void> => {
  await v1_api.delete(`/catalogo/producto/${id}/`);
}