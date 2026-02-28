import { v1_api } from "@/src/api/v1.api";
import type { ProductCategory, ProductCategoryCreate } from "../interfaces/product-category.interface";


export const getProductCategories = async (): Promise<ProductCategory[]> => {
  const { data } = await v1_api.get<ProductCategory[]>("/catalogo/categoria-producto/");
  return data;
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
