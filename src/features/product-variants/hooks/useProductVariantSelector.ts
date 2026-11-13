import {
  createCatalogSelectorHooks,
  type CatalogSearchFilters,
} from "@/src/hooks/createCatalogSelectorHooks";
import { toCatalogSelectorQuery } from "@/src/utils/catalogSelectorQuery";
import { getProductVariantSelector } from "../services/actions";
import type {
  ProductVariantSelectorItem,
  ProductVariantSelectorParams,
} from "../interfaces/product-variant-selector.interface";

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

type VariantSearchFilters = CatalogSearchFilters<ProductVariantSelectorParams>;

const variantSelector = createCatalogSelectorHooks<
  ProductVariantSelectorItem,
  ProductVariantSelectorParams
>({
  queryKey: productVariantSelectorQueryKey,
  fetcher: getProductVariantSelector,
  toastIds: {
    search: "product-variant-search-refetch-error",
    total: "product-variant-total-refetch-error",
  },
  searchErrorMessage:
    "No se pudo actualizar la búsqueda de variantes. Mostrando los resultados anteriores.",
});

/**
 * Búsqueda de variantes EN EL SERVIDOR para los selectores (`?q=` + `?limit=`),
 * en vez de descargar el catálogo completo y filtrarlo en memoria. El término
 * DEBE llegar ya debounced: cada valor es una petición.
 *
 * Solo trae variantes activas de productos activos (lo filtra el backend).
 * `variants` son las primeras coincidencias de la página; `total` cuántas hay,
 * para avisar que hay más (ver `createCatalogSelectorHooks`).
 */
export const useProductVariantSearch = (
  filters: VariantSearchFilters,
  options: { enabled?: boolean } = {},
) => {
  const { items, ...query } = variantSelector.useSearch(filters, options);
  return { variants: items, ...query };
};

/**
 * Buscador de un selector de variantes: el texto tecleado (`search`), el
 * término debounced que viaja (`term`), su consulta e `isSearching` (lo
 * pintado es de la búsqueda anterior). Lo que esperan las props de
 * `ServerSearchSelectList`.
 */
export const useProductVariantSearchField = (
  filters: Omit<VariantSearchFilters, "q"> = {},
  options: { enabled?: boolean } = {},
) => {
  const { items, ...field } = variantSelector.useSearchField(filters, options);
  return { variants: items, ...field };
};

/**
 * ¿Hay al menos una variante activa elegible? Una página de UNA fila: lo que
 * cuenta es `total`. Sirve a las pantallas que avisan "faltan variantes" antes
 * de abrir su formulario, sin descargar el catálogo.
 */
export const useProductVariantSelectorTotal = () => variantSelector.useTotal();
