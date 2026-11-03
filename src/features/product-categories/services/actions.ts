import { v1_api } from "@/src/api/v1.api";
import type { ProductCategory, ProductCategoryCreate } from "../interfaces/product-category.interface";
import { normalizeProductCategory, type ProductCategoryResponse } from "../utils/normalizeProductCategory";


/**
 * Sin parámetros a propósito: se pasa tal cual como `queryFn` (aquí y en el
 * prefetch de Configuración), así que TanStack le pasaría su contexto.
 *
 * Normaliza `linea` a `""` cuando falta o viene `null`: toda la app la lee
 * como string (`""` = sin línea) y una categoría sin el campo no debe formar un
 * grupo aparte ni pasar por "sin categoría".
 */
export const getProductCategories = async (): Promise<ProductCategory[]> => {
  const { data } = await v1_api.get<ProductCategoryResponse[]>("/catalogo/categoria-producto/");
  return data.map(normalizeProductCategory);
};

export const createProductCategory = async (productCategory: ProductCategoryCreate): Promise<ProductCategory> => {
  const { data } = await v1_api.post<ProductCategory>("/catalogo/categoria-producto/", productCategory);
  return data;
};

export const updateProductCategory = async (id: number, productCategory: ProductCategoryCreate): Promise<ProductCategory> => {
  const { data } = await v1_api.put<ProductCategory>(`/catalogo/categoria-producto/${id}/`, productCategory);
  return data;
};

export const deleteProductCategory = async (id: number): Promise<void> => {
  await v1_api.delete(`/catalogo/categoria-producto/${id}/`);
};
