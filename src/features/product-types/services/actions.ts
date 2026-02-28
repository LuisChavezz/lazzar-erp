import { v1_api } from "@/src/api/v1.api";
import type { ProductType, ProductTypeCreate } from "../interfaces/product-type.interface";


export const getProductTypes = async (): Promise<ProductType[]> => {
  const { data } = await v1_api.get<ProductType[]>("/catalogo/tipo-producto/");
  return data;
};

export const createProductType = async (productType: ProductTypeCreate): Promise<ProductType> => {
  const { data } = await v1_api.post<ProductType>("/catalogo/tipo-producto/", productType);
  return data;
};

export const updateProductType = async (id: number, productType: ProductTypeCreate): Promise<ProductType> => {
  const { data } = await v1_api.put<ProductType>(`/catalogo/tipo-producto/${id}/`, productType);
  return data;
};

export const deleteProductType = async (id: number): Promise<void> => {
  await v1_api.delete(`/catalogo/tipo-producto/${id}/`);
};