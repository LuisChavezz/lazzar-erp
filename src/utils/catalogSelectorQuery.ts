/** Valor de un parámetro de los selectores de catálogo antes de normalizar. */
type CatalogSelectorParamValue = string | number | boolean | readonly number[] | undefined;

/**
 * Parámetros de `catalogo/producto/selector/` y `catalogo/producto-variante/selector/`
 * (EC-886) tal como viajan en la URL, y tal como van en la llave de la consulta:
 *
 * - texto recortado; vacío se omite (un `q=` vacío pediría lo mismo que sin `q`
 *   y partiría la caché en dos llaves);
 * - un arreglo va separado por comas (`ids=1,2`, `tipo_id=1,3`): axios lo
 *   serializaría como `ids[]=1&ids[]=2`, clave que el backend no lee. Uno vacío
 *   se omite (`?ids=` vacío = sin `ids`);
 * - `undefined` se omite; un booleano viaja como `true`/`false`.
 *
 * Las claves salen en orden alfabético para que dos llamadas con los mismos
 * parámetros den la misma llave de consulta.
 */
export function toCatalogSelectorQuery<
  TParams extends { [K in keyof TParams]: CatalogSelectorParamValue },
>(params: TParams): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = {};
  const entries = Object.entries(params) as [string, CatalogSelectorParamValue][];
  for (const [key, value] of entries.sort(([a], [b]) => a.localeCompare(b))) {
    if (value === undefined) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed !== "") query[key] = trimmed;
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length > 0) query[key] = value.join(",");
      continue;
    }
    query[key] = value as number | boolean;
  }
  return query;
}

/** Tamaño de página de las búsquedas de los selectores de catálogo (el default del backend). */
export const CATALOG_SELECTOR_PAGE_SIZE = 50;

/** Tope de `?ids=` (y de `limit`) en los selectores de catálogo. */
export const CATALOG_SELECTOR_MAX_IDS = 500;

/** Espera tras la última tecla antes de buscar en un selector de catálogo. */
export const CATALOG_SELECTOR_DEBOUNCE_MS = 300;
