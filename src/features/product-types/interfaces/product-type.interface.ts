/**
 * `GET /catalogo/tipo-producto/` (`TipoProductoSerializer`, `fields='__all__'`).
 * Catálogo GLOBAL (sin empresa): MP, PT, SERVICIO, COMPRAS. El listado trae
 * solo los activos, así que `activo` llega siempre `true` en él.
 */
export interface ProductType {
  id: number;
  codigo: string;
  /** Nombre visible ("Materia prima"). El backend lo admite vacío (`default=""`). */
  nombre: string;
  activo: boolean;
}

export interface ProductTypeCreate {
  codigo: string;
}
