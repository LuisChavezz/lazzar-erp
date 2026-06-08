/** Información del usuario asociado al movimiento. */
export interface UsuarioInfo {
  id: number;
  nombre: string;
  email?: string | null;
}

/** Información de origen o destino del movimiento. */
export interface MovementLocationInfo {
  id: number;
  nombre: string;
  codigo?: string | null;
  tipo?: string | null;
}

/** Detalle de mutación de stock (cantidad por producto/variante). */
export interface StockMutation {
  producto: string;
  sku?: string | null;
  cantidad: number;
  unidad: string;
  cantidad_anterior?: number | null;
  cantidad_nueva?: number | null;
}

/** Información adicional del movimiento. */
export interface MovimientoInfo {
  folio_referencia?: string | null;
  origen?: MovementLocationInfo | null;
  destino?: MovementLocationInfo | null;
  mutaciones?: StockMutation[];
  cantidad_total?: number | null;
}

export interface StockMovement {
  id: number;
  activo: boolean;
  tipo_movimiento: string;
  fecha_movimiento: string;
  observaciones: string | null;
  empresa: number;
  sucursal: number;
  pedido: number | null;
  entrega: number | null;
  devolucion: number | null;
  ajuste_inventario: number | null;
  usuario: number;
  recepcion: number | null;
  transferencia: number | null;
  op: number | null;
  /** Datos adicionales del movimiento (folio, origen, destino, mutaciones). */
  movimiento_info?: MovimientoInfo | null;
  /** Información del usuario que realizó el movimiento. */
  usuario_info?: UsuarioInfo | null;
}

