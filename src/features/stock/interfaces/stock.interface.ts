/**
 * Información del producto/variante devuelta por el endpoint de existencias.
 * Incluye datos del producto base más los de la variante (color, talla, SKU).
 */
export interface ProductoInfo {
  id: number;
  nombre: string | null;
  descripcion: string | null;
  tipo: string | null;
  categoria_producto: number | null;
  unidad_medida: number | null;
  sku: string | null;
  color_id: number | null;
  color: string | null;
  talla_id: number | null;
  talla: string | null;
}

/** Información del almacén devuelta por el endpoint de existencias. */
export interface AlmacenInfo {
  id_almacen: number;
  codigo: string | null;
  nombre: string | null;
  empresa: number;
  sucursal: number;
  estatus: string | null;
  tipo_almacen: string | null;
}

/** Información de la ubicación devuelta por el endpoint de existencias. */
export interface UbicacionInfo {
  id_ubicacion: number;
  almacen: number;
  tipo_ubicacion: string | null;
  estatus: string | null;
  pasillo: string | null;
  rack: string | null;
  nivel: string | null;
  posicion: string | null;
  nombre_completo: string | null;
}

export interface StockItem {
  id: number;
  producto_info: ProductoInfo;
  almacen_info: AlmacenInfo;
  ubicacion_info: UbicacionInfo;
  lote_info: Record<string, unknown> | null;
  serie_info: Record<string, unknown> | null;
  stock: number;
  producto_variante: number;
  almacen: number;
  ubicacion: number;
}