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
