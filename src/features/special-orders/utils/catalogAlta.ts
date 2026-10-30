import type { SpecialOrderLine } from "../interfaces/special-order.interface";

export const CATALOG_ALTA_WITHOUT_CATEGORY =
  "La línea no tiene categoría de producto (se captura en la cotización), así que no se puede dar de alta en catálogo.";

export const CATALOG_ALTA_WITH_EXISTING_SKUS =
  "La línea ya tiene SKU de producción generados. El alta en catálogo solo está disponible en la primera generación: repetirla crearía un segundo producto para la misma línea.";

/**
 * Por qué la línea NO admite "Dar de alta en catálogo", o `null` si lo admite.
 *
 * - Sin `categoria_producto` el backend responde `400 {"alta_catalogo"}`.
 * - Con variantes de producción ya generadas, el alta incremental con
 *   `alta_catalogo` crearía un SEGUNDO `Producto` para la línea (bug del
 *   backend). La señal es `sku_produccion` en cualquier talla: el detalle lo
 *   llena desde las variantes activas de la línea y el alta siempre les pone
 *   SKU. NO sirve `sku_siguiente === null`, que también es `null` sin color o
 *   con un color sin código.
 */
export function getCatalogAltaBlockReason(line: SpecialOrderLine): string | null {
  if (line.categoria_producto === null) return CATALOG_ALTA_WITHOUT_CATEGORY;
  if (line.tallas.some((talla) => Boolean(talla.sku_produccion))) {
    return CATALOG_ALTA_WITH_EXISTING_SKUS;
  }
  return null;
}
