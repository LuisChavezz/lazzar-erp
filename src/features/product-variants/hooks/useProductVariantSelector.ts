import { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { useServerSearchTerm } from "@/src/hooks/useServerSearchTerm";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import {
  CATALOG_SELECTOR_DEBOUNCE_MS,
  CATALOG_SELECTOR_PAGE_SIZE,
  toCatalogSelectorQuery,
} from "@/src/utils/catalogSelectorQuery";
import { getProductVariantSelector } from "../services/actions";
import type { ProductVariantSelectorParams } from "../interfaces/product-variant-selector.interface";

/**
 * Llave de `GET /catalogo/producto-variante/selector/`. Cuelga del prefijo
 * `["product-variants"]` que ya invalidan las mutaciones de variantes (y las de
 * BOM, porque `tiene_bom` cambia con ellas), así que todas las búsquedas se
 * refrescan sin tocar esas mutaciones. El segmento `"selector"` las separa del
 * listado completo (la raíz `["product-variants"]`, que siguen usando las
 * tablas de catálogo). Los parámetros van normalizados: dos búsquedas iguales
 * comparten llave.
 */
export const productVariantSelectorQueryKey = (params: ProductVariantSelectorParams) =>
  ["product-variants", "selector", toCatalogSelectorQuery(params)] as const;

type VariantSearchFilters = Omit<ProductVariantSelectorParams, "ids" | "limit" | "offset">;

/**
 * Búsqueda de variantes EN EL SERVIDOR para los selectores (`?q=` + `?limit=`),
 * en vez de descargar el catálogo completo y filtrarlo en memoria. El término
 * DEBE llegar ya debounced: cada valor es una petición.
 *
 * Solo trae variantes activas de productos activos (lo filtra el backend).
 * `variants` son las primeras `CATALOG_SELECTOR_PAGE_SIZE` coincidencias;
 * `total` cuántas hay, para avisar que hay más. `keepPreviousData` conserva
 * los resultados anteriores mientras llegan los nuevos.
 */
export const useProductVariantSearch = (
  filters: VariantSearchFilters,
  { enabled = true }: { enabled?: boolean } = {},
) => {
  const params: ProductVariantSelectorParams = { ...filters, limit: CATALOG_SELECTOR_PAGE_SIZE };
  const { data, hasLoaded, isInitialError, error, isFetching, isPlaceholderData, refetch } =
    useGuardedQuery(
      {
        queryKey: productVariantSelectorQueryKey(params),
        queryFn: () => getProductVariantSelector(params),
        retry: retryUnlessClientError,
        enabled,
        // Sin `enabled` no hay resultados que conservar: v5 aplicaría el
        // placeholder también a la consulta deshabilitada.
        placeholderData: enabled ? keepPreviousData : undefined,
      },
      {
        toastId: "product-variant-search-refetch-error",
        errorMessage:
          "No se pudo actualizar la búsqueda de variantes. Mostrando los resultados anteriores.",
      },
    );

  return {
    variants: data?.results ?? [],
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
 * Buscador de un selector de variantes: el texto tecleado (`search`), el
 * término debounced que viaja (`term`), su consulta (`useProductVariantSearch`)
 * e `isSearching` (lo pintado es de la búsqueda anterior). Lo que esperan las
 * props de `ServerSearchSelectList`.
 */
export const useProductVariantSearchField = (
  filters: Omit<VariantSearchFilters, "q"> = {},
  { enabled = true }: { enabled?: boolean } = {},
) => {
  const [search, setSearch] = useState("");
  const { term, isDebouncing } = useServerSearchTerm(search, CATALOG_SELECTOR_DEBOUNCE_MS);
  const query = useProductVariantSearch({ ...filters, q: term }, { enabled });
  const isSearching = query.isPlaceholderData || isDebouncing;
  return { search, setSearch, term, isSearching, ...query };
};

/**
 * ¿Hay al menos una variante activa elegible? Una página de UNA fila: lo que
 * cuenta es `total`. Sirve a las pantallas que avisan "faltan variantes" antes
 * de abrir su formulario, sin descargar el catálogo.
 */
export const useProductVariantSelectorTotal = () => {
  const params: ProductVariantSelectorParams = { limit: 1 };
  const { data, isLoading, isInitialError } = useGuardedQuery(
    {
      queryKey: productVariantSelectorQueryKey(params),
      queryFn: () => getProductVariantSelector(params),
      retry: retryUnlessClientError,
    },
    { toastId: "product-variant-total-refetch-error" },
  );
  return { total: data?.count, isLoading, isInitialError };
};
