/**
 * Fila de `GET /catalogo/producto/selector/` (EC-886): lo que leen los
 * selectores de producto, sin la fila completa del listado (`fields='__all__'`).
 *
 * `tipo` y `categoria_producto` son ids, como en `Product`; `unidad_*` con la
 * misma forma que el listado. Sin `?ids=` solo devuelve productos activos; con
 * `?ids=` devuelve esos ids aunque estén inactivos.
 */
export interface ProductSelectorItem {
  id: number;
  nombre: string;
  codigo: string | null;
  descripcion: string;
  activo: boolean;
  unidad_id: number | null;
  unidad_nombre: string | null;
  unidad_abreviatura: string | null;
  tipo: number | null;
  categoria_producto: number | null;
}

/** Parámetros del selector de productos (todos opcionales; vacío = primera página). */
export interface ProductSelectorParams {
  /** Subcadena en nombre, codigo, cod_proscai y descripcion. */
  q?: string;
  /** Uno o varios ids de `TipoProducto`. */
  tipo_id?: number | readonly number[];
  /**
   * Resuelve estos ids (máx. 500) aunque estén inactivos; el backend ignora
   * entonces `q` y los filtros, y sin `limit` los devuelve todos en una página.
   */
  ids?: readonly number[];
  limit?: number;
  offset?: number;
}
