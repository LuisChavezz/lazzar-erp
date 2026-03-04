import { v1_api } from "@/src/api/v1.api";
import { ProductVariant, ProductVariantCreate } from "../interfaces/product-variant.interface";


export const getProductVariants = async (): Promise<ProductVariant[]> => {
  const response = await v1_api.get<ProductVariant[]>("/catalogo/producto-variante/");
  return response.data;
};

export const getProductVariant = async (id: number): Promise<ProductVariant> => {
  const response = await v1_api.get<ProductVariant>(`/catalogo/producto-variante/${id}/`);
  return response.data;
};

export const createProductVariant = async (productVariant: ProductVariantCreate): Promise<ProductVariant> => {
  const response = await v1_api.post<ProductVariant>("/catalogo/producto-variante/", productVariant);
  return response.data;
};

export const updateProductVariant = async (id: number, productVariant: ProductVariantCreate): Promise<ProductVariant> => {
  const response = await v1_api.put<ProductVariant>(`/catalogo/producto-variante/${id}/`, productVariant);
  return response.data;
};

export const deleteProductVariant = async (id: number): Promise<void> => {
  await v1_api.delete(`/catalogo/producto-variante/${id}/`);
};
