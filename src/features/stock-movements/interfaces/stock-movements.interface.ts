export interface StockMovementSnapshotItem {
  delta: string;
  producto_id: number;
  ubicacion_id: number;
  cantidad_after: string;
  cantidad_before: string;
  producto_variante_id: number;
}

export interface StockMovementSnapshot {
  items: StockMovementSnapshotItem[];
  ajuste_id: number;
  almacen_id?: number;
  empresa_id?: number;
  sucursal_id?: number;
}

export interface StockMovement {
  id: number;
  id_evento: number;
  empresa: number;
  usuario: number;
  usuario_nombre: string;
  modulo: string;
  accion: string;
  tipo_movimiento: string;
  tabla: string;
  id_registro: string;
  antes_json: StockMovementSnapshot;
  despues_json: StockMovementSnapshot;
  ip: string;
  user_agent: string;
  fecha: string;
  fecha_movimiento: string;
  created_at: string;
}

export interface StockMovementDetailItem {
  delta: string;
  producto_id: number;
  ubicacion_id: number | null;
  cantidad_after: string;
  cantidad_before: string;
  producto_variante_id: number | null;
  producto_nombre: string;
  ubicacion_nombre: string | null;
}

export interface StockMovementAntesJson {
  items: StockMovementDetailItem[];
  recepcion_id: number;
}

export interface StockMovementDespuesJson {
  items: StockMovementDetailItem[];
  almacen_id: number;
  empresa_id: number;
  sucursal_id: number;
  recepcion_id: number;
}

export interface StockMovementDetail {
  id: number;
  tipo_movimiento: string;
  fecha: string;
  usuario: number;
  usuario_nombre: string;
  almacen_id: number;
  almacen_nombre: string;
  sucursal_id: number;
  sucursal_nombre: string;
  empresa_id: number;
  empresa_nombre: string;
  detalle_count: number;
  detalle: StockMovementDetailItem[];
  antes_json: StockMovementAntesJson;
  despues_json: StockMovementDespuesJson;
}
