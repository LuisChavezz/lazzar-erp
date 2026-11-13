import { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { useServerSearchTerm } from "@/src/hooks/useServerSearchTerm";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import {
  CATALOG_SELECTOR_DEBOUNCE_MS,
  CATALOG_SELECTOR_MAX_IDS,
  CATALOG_SELECTOR_PAGE_SIZE,
  toCatalogSelectorQuery,
} from "@/src/utils/catalogSelectorQuery";
import { getProductSelector } from "../services/actions";
import type { ProductSelectorParams } from "../interfaces/product-selector.interface";

/**
 * Llave de `GET /catalogo/producto/selector/`. Cuelga del prefijo
 * `["products"]` que ya invalidan las mutaciones de productos. El segmento
 * `"selector"` evita chocar con los listados completos (`["products", tipo_id]`,
 * que siguen usando las tablas).
 * Los parámetros van normalizados: dos búsquedas iguales comparten llave.
 */
export const productSelectorQueryKey = (params: ProductSelectorParams) =>
  ["products", "selector", toCatalogSelectorQuery(params)] as const;

type ProductSearchFilters = Omit<ProductSelectorParams, "ids" | "limit" | "offset">;

/**
 * Búsqueda de productos EN EL SERVIDOR para los selectores (`?q=` + `?limit=`),
 * en vez de descargar el catálogo completo y filtrarlo en memoria. El término
 * DEBE llegar ya debounced: cada valor es una petición.
 *
 * Solo trae productos activos (lo filtra el backend). `products` son las
 * primeras `CATALOG_SELECTOR_PAGE_SIZE` coincidencias; `total` cuántas hay.
 */
export const useProductSearch = (
  filters: ProductSearchFilters,
  { enabled = true }: { enabled?: boolean } = {},
) => {
  const params: ProductSelectorParams = { ...filters, limit: CATALOG_SELECTOR_PAGE_SIZE };
  const { data, hasLoaded, isInitialError, error, isFetching, isPlaceholderData, refetch } =
    useGuardedQuery(
      {
        queryKey: productSelectorQueryKey(params),
        queryFn: () => getProductSelector(params),
        retry: retryUnlessClientError,
        enabled,
        // Sin `enabled` no hay resultados que conservar: v5 aplicaría el
        // placeholder también a la consulta deshabilitada.
        placeholderData: enabled ? keepPreviousData : undefined,
      },
      {
        toastId: "product-search-refetch-error",
        errorMessage:
          "No se pudo actualizar la búsqueda de productos. Mostrando los resultados anteriores.",
      },
    );

  return {
    products: data?.results ?? [],
    total: data?.count ?? 0,
    /** Hay resultados que pintar (de esta búsqueda o, mientras llega, de la anterior). */
    hasResults: data !== undefined,
    hasLoaded,
    isInitialError,
    error,
    isFetching,
    isPlaceholderData,
    refetch,
  };
};

/**
 * Buscador de un selector de productos: el texto tecleado (`search`), su
 * consulta debounced (`useProductSearch`) e `isSearching` (lo pintado es de
 * la búsqueda anterior). Lo que esperan las props de `ServerSearchSelectList`.
 */
export const useProductSearchField = (
  filters: Omit<ProductSearchFilters, "q"> = {},
  { enabled = true }: { enabled?: boolean } = {},
) => {
  const [search, setSearch] = useState("");
  const { term, isDebouncing } = useServerSearchTerm(search, CATALOG_SELECTOR_DEBOUNCE_MS);
  const query = useProductSearch({ ...filters, q: term }, { enabled });
  const isSearching = query.isPlaceholderData || isDebouncing;
  return { search, setSearch, term, isSearching, ...query };
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
export const useProductSelectorTotal = (filters: Pick<ProductSearchFilters, "tipo_id"> = {}) => {
  const params: ProductSelectorParams = { ...filters, limit: 1 };
  const { data, isLoading, isInitialError, error } = useGuardedQuery(
    {
      queryKey: productSelectorQueryKey(params),
      queryFn: () => getProductSelector(params),
      retry: retryUnlessClientError,
    },
    { toastId: "product-total-refetch-error" },
  );
  return { total: data?.count, isLoading, isInitialError, error };
};
