/**
 * Fila de `GET /catalogo/producto-variante/selector/` (EC-886): lo que leen los
 * selectores de variante, sin la fila completa del listado.
 *
 * - `cod_proscai` es el del PRODUCTO, igual que en `ProductVariant`.
 * - `sku_produccion`: SKU `MP…` de una muestra dada de alta en catálogo, o `null`.
 * - `tiene_bom`: la variante tiene una lista de materiales ACTIVA en la empresa
 *   del usuario. Solo existe en el selector (ni el listado ni el detalle de OP
 *   lo traen).
 *
 * Sin `?ids=` el selector solo devuelve variantes activas de productos
 * activos; con `?ids=` devuelve esos ids aunque estén inactivos.
 */
export interface ProductVariantSelectorItem {
  id: number;
  sku: string;
  nombre: string;
  cod_proscai: string;
  sku_produccion: string | null;
  tiene_bom: boolean;
  activo: boolean;
}

/** Parámetros del selector de variantes (todos opcionales; vacío = primera página). */
export interface ProductVariantSelectorParams {
  /** Subcadena en sku, cod_proscai, nombre, nombre del producto y sku_produccion. */
  q?: string;
  /** Solo variantes con (`true`) o sin (`false`) BOM activo. */
  tiene_bom?: boolean;
  /**
   * Resuelve estos ids (máx. 500) aunque estén inactivos; el backend ignora
   * entonces `q` y los filtros, y sin `limit` los devuelve todos en una página.
   */
  ids?: readonly number[];
  limit?: number;
  offset?: number;
}
