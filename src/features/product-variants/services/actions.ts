import { v1_api } from "@/src/api/v1.api";
import { ProductVariant, ProductVariantCreate } from "../interfaces/product-variant.interface";
import type {
  ProductVariantSelectorItem,
  ProductVariantSelectorParams,
} from "../interfaces/product-variant-selector.interface";
import type { PaginatedListResponse } from "@/src/utils/serverListAdapters";
import { toCatalogSelectorQuery } from "@/src/utils/catalogSelectorQuery";


export const getProductVariants = async (con_bom?: boolean): Promise<ProductVariant[]> => {
  const response = await v1_api.get<ProductVariant[]>("/catalogo/producto-variante/", {
    params: {
      ...(con_bom !== undefined && { con_bom }),
    },
  });
  return response.data;
};

/**
 * Selector ligero de variantes (`GET /catalogo/producto-variante/selector/`,
 * EC-886): siempre paginado (`{count, next, previous, results}`, 50 por
 * defecto, tope 500). Los parámetros viajan normalizados por
 * `toCatalogSelectorQuery` (sin vacíos, `ids` separados por comas).
 */
export const getProductVariantSelector = async (
  params: ProductVariantSelectorParams,
): Promise<PaginatedListResponse<ProductVariantSelectorItem>> => {
  const response = await v1_api.get<PaginatedListResponse<ProductVariantSelectorItem>>(
    "/catalogo/producto-variante/selector/",
    { params: toCatalogSelectorQuery(params) },
  );
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
