import { v1_api } from "@/src/api/v1.api";
import { Product, ProductUpdate } from "../interfaces/product.interface";
import type { ProductSelectorItem, ProductSelectorParams } from "../interfaces/product-selector.interface";
import type { PaginatedListResponse } from "@/src/utils/serverListAdapters";
import { toCatalogSelectorQuery } from "@/src/utils/catalogSelectorQuery";


/**
 * `tipo_id` acepta uno o VARIOS tipos. Una lista viaja en forma de comas
 * (`?tipo_id=1,3`), que el backend acepta igual que el parámetro repetido; no se
 * pasa el arreglo tal cual porque axios lo serializaría como `tipo_id[]=1&...`,
 * clave que el backend no lee (filtraría nada y devolvería todos los tipos).
 */
export const getProducts = async (
  tipo_id?: number | readonly number[],
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
 * Selector ligero de productos (`GET /catalogo/producto/selector/`, EC-886):
 * siempre paginado (`{count, next, previous, results}`, 50 por defecto, tope
 * 500). Los parámetros viajan normalizados por `toCatalogSelectorQuery`
 * (sin vacíos; `tipo_id` e `ids` separados por comas).
 */
export const getProductSelector = async (
  params: ProductSelectorParams,
): Promise<PaginatedListResponse<ProductSelectorItem>> => {
  const response = await v1_api.get<PaginatedListResponse<ProductSelectorItem>>(
    "/catalogo/producto/selector/",
    { params: toCatalogSelectorQuery(params) },
  );
  return response.data;
};

// Sin `createProduct`: el alta de productos va solo por el alta rápida
// (`product-onboarding`, `POST /catalogo/producto/onboarding/`), que asigna el
// `codigo`. El `POST` base lo dejaría en `null`.

export const updateProduct = async (id: number, product: ProductUpdate): Promise<Product> => {
  const response = await v1_api.put<Product>(`/catalogo/producto/${id}/`, product);
  return response.data;
}

export const deleteProduct = async (id: number): Promise<void> => {
  await v1_api.delete(`/catalogo/producto/${id}/`);
}