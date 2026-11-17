import { v1_api } from "@/src/api/v1.api";
import { ProductVariant, ProductVariantCreate } from "../interfaces/product-variant.interface";
import type {
  ProductVariantSelectorItem,
  ProductVariantSelectorParams,
} from "../interfaces/product-variant-selector.interface";
import type { PaginatedListResponse } from "@/src/utils/serverListAdapters";
import { toCatalogSelectorQuery } from "@/src/utils/catalogSelectorQuery";


/**
 * Listado COMPLETO de variantes (sin paginar). Ya no lo leen las tablas de
 * catálogo (EC-897, `getProductVariantsPage`); queda para quien necesita
 * buscar entre todas en memoria (`CreateResurtidoDialog`, por SKU).
 */
export const getProductVariants = async (): Promise<ProductVariant[]> => {
  const response = await v1_api.get<ProductVariant[]>("/catalogo/producto-variante/");
  return response.data;
};

/**
 * Una página del listado de variantes (`?limit=&offset=`, EC-886) con los
 * filtros, la búsqueda y el orden de las tablas de catálogo en modo servidor
 * (EC-896/897). Los parámetros llegan ya validados y con los nombres del
 * endpoint (`toCatalogListApiParams`).
 */
export const getProductVariantsPage = async (
  params: Record<string, string | number>,
): Promise<PaginatedListResponse<ProductVariant>> => {
  const response = await v1_api.get<PaginatedListResponse<ProductVariant>>(
    "/catalogo/producto-variante/",
    { params },
  );
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
