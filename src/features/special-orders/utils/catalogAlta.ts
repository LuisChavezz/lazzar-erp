import type {
  SpecialOrderLine,
  SpecialOrderTalla,
} from "../interfaces/special-order.interface";

/** Aviso del botón "Dar de alta en catálogo" deshabilitado por falta de categoría. */
export const CATALOG_ALTA_BUTTON_NO_CATEGORY =
  "Sin categoría; se captura en la cotización.";

/**
 * La talla tiene SKU de producción que aún no está en catálogo. Hace falta
 * `sku_produccion`: `aplica_catalogo` también es `false` en una talla SIN
 * variante, y esa no tiene nada que dar de alta.
 */
export const isTallaPendingCatalogAlta = (talla: SpecialOrderTalla): boolean =>
  Boolean(talla.sku_produccion) && !talla.aplica_catalogo;

/**
 * La línea tiene algo que dar de alta con `alta-catalogo`: alguna talla con
 * SKU de producción pendiente. Es la condición para ofrecer el botón; sin
 * pendientes el backend responde `400` en `pedido_detalle_id`.
 */
export const hasPendingCatalogAlta = (line: SpecialOrderLine): boolean =>
  line.tallas.some(isTallaPendingCatalogAlta);

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
