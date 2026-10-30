import type { ProductVariant } from "../interfaces/product-variant.interface";

/** Campos de una variante por los que buscan los selectores de variante. */
export type SearchableProductVariant = Pick<
  ProductVariant,
  "sku" | "nombre" | "cod_proscai" | "sku_produccion"
>;

/**
 * Textos buscables de una variante: SKU, nombre, código Proscai y SKU de
 * producción (MP… de una muestra dada de alta en catálogo). Omite los vacíos y
 * los `null`, así que nunca aporta "null" ni una cadena vacía a la búsqueda.
 */
export function getProductVariantSearchFields(variant: SearchableProductVariant): string[] {
  return [variant.sku, variant.nombre, variant.cod_proscai, variant.sku_produccion].filter(
    (field): field is string => typeof field === "string" && field.trim() !== "",
  );
}

/**
 * `true` si el término aparece (sin distinguir mayúsculas, como subcadena)
 * dentro de ALGUNO de los campos. Se compara campo por campo a propósito: un
 * término no debe casar a caballo entre dos campos (p. ej. "G 30013" con el
 * nombre "… - G" seguido del SKU "30013-703-G"). Un término vacío casa todo.
 */
export function matchesSearchFields(fields: string[], term: string): boolean {
  const query = term.trim().toLowerCase();
  if (!query) return true;
  return fields.some((field) => field.toLowerCase().includes(query));
}

/** Búsqueda de variante compartida por Movimientos, Nueva OP y Traspasos. */
export function matchesProductVariantSearch(
  variant: SearchableProductVariant,
  term: string,
): boolean {
  return matchesSearchFields(getProductVariantSearchFields(variant), term);
}
