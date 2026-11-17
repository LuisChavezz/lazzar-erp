import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import {
  createCatalogSelectorHooks,
  type CatalogSearchFilters,
} from "@/src/hooks/createCatalogSelectorHooks";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import { CATALOG_SELECTOR_MAX_IDS, toCatalogSelectorQuery } from "@/src/utils/catalogSelectorQuery";
import { getProductSelector } from "../services/actions";
import type {
  ProductSelectorItem,
  ProductSelectorParams,
} from "../interfaces/product-selector.interface";

/**
 * Llave de `GET /catalogo/producto/selector/`. Cuelga del prefijo
 * `["products"]` que ya invalidan las mutaciones de productos. El segmento
 * `"selector"` evita chocar con las tablas de catálogo
 * (`["products", "table", …]`).
 * Los parámetros van normalizados: dos búsquedas iguales comparten llave.
 */
export const productSelectorQueryKey = (params: ProductSelectorParams) =>
  ["products", "selector", toCatalogSelectorQuery(params)] as const;

type ProductSearchFilters = CatalogSearchFilters<ProductSelectorParams>;

const productSelector = createCatalogSelectorHooks<ProductSelectorItem, ProductSelectorParams>({
  queryKey: productSelectorQueryKey,
  fetcher: getProductSelector,
  toastIds: { search: "product-search-refetch-error", total: "product-total-refetch-error" },
  searchErrorMessage:
    "No se pudo actualizar la búsqueda de productos. Mostrando los resultados anteriores.",
});

/**
 * Búsqueda de productos EN EL SERVIDOR para los selectores (`?q=` + `?limit=`),
 * en vez de descargar el catálogo completo y filtrarlo en memoria. El término
 * DEBE llegar ya debounced: cada valor es una petición.
 *
 * Solo trae productos activos (lo filtra el backend). `products` son las
 * primeras coincidencias de la página; `total` cuántas hay (ver
 * `createCatalogSelectorHooks`).
 */
export const useProductSearch = (
  filters: ProductSearchFilters,
  options: { enabled?: boolean } = {},
) => {
  const { items, ...query } = productSelector.useSearch(filters, options);
  return { products: items, ...query };
};

/**
 * Buscador de un selector de productos: el texto tecleado (`search`), su
 * consulta debounced e `isSearching` (lo pintado es de la búsqueda anterior).
 * Lo que esperan las props de `ServerSearchSelectList`.
 */
export const useProductSearchField = (
  filters: Omit<ProductSearchFilters, "q"> = {},
  options: { enabled?: boolean } = {},
) => {
  const { items, ...field } = productSelector.useSearchField(filters, options);
  return { products: items, ...field };
};

/**
 * Resuelve productos YA elegidos por su id (`?ids=`), para pantallas que
 * arrancan de ids sueltos (la edición de una variante). El backend los
 * devuelve aunque estén inactivos o sean de otro tipo, siempre de la empresa
 * del usuario, y sin `limit` todos en una página. Un id que no llega (ajeno o
 * inexistente) simplemente falta en `productsById`.
 *
 * Los ids se ordenan y se quitan repetidos y no positivos: la llave no
 * depende del orden de la selección. Sin ids no consulta. Más de
 * `CATALOG_SELECTOR_MAX_IDS` serían un 400 del backend: se recortan.
 */
export const useProductsByIds = (ids: readonly number[]) => {
  const uniqueIds = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))]
    .sort((a, b) => a - b)
    .slice(0, CATALOG_SELECTOR_MAX_IDS);
  const params: ProductSelectorParams = { ids: uniqueIds };
  const { data, isLoading, isInitialError, error, refetch } = useGuardedQuery(
    {
      queryKey: productSelectorQueryKey(params),
      queryFn: () => getProductSelector(params),
      retry: retryUnlessClientError,
      enabled: uniqueIds.length > 0,
    },
    { toastId: "products-by-ids-refetch-error" },
  );

  return {
    productsById: new Map((data?.results ?? []).map((product) => [product.id, product])),
    isLoading,
    isInitialError,
    error,
    refetch,
  };
};

/**
 * ¿Hay al menos un producto activo de estos tipos? Una página de UNA fila: lo
 * que cuenta es `total`. Sirve a los formularios que avisan "faltan productos"
 * antes de abrirse, sin descargar el catálogo.
 */
export const useProductSelectorTotal = (filters: Pick<ProductSearchFilters, "tipo_id"> = {}) =>
  productSelector.useTotal(filters);
