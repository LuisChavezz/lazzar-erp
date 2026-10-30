import type { SpecialOrderLine } from "../interfaces/special-order.interface";

export const CATALOG_ALTA_WITHOUT_CATEGORY =
  "La línea no tiene categoría de producto, así que no se puede dar de alta en catálogo.";

/**
 * Por qué la línea NO admite "Dar de alta en catálogo", o `null` si lo admite.
 *
 * Solo la categoría: sin `categoria_producto` el backend responde
 * `400 {"alta_catalogo"}`. Que la línea ya tenga SKU de producción NO lo
 * impide: el backend cuelga las tallas nuevas del producto de catálogo que la
 * línea ya tenga (un producto por línea), así que un alta incremental con
 * `alta_catalogo` no crea un segundo producto.
 */
export function getCatalogAltaBlockReason(line: SpecialOrderLine): string | null {
  if (line.categoria_producto === null) return CATALOG_ALTA_WITHOUT_CATEGORY;
  return null;
}
