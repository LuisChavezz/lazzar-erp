// Reporte de movimientos de inventario por periodo — endpoint paginado del
// backend (`/inventarios/movimientos/reporte-movimientos-periodo/`).
//
// DIFERENCIAS con existencias: este endpoint (a) exige un `tipo_movimiento`
// (ENTRADA/SALIDA/AJUSTE/TRANSFERENCIA) y (b) tiene `almacen_id` OPCIONAL. La
// exportación completa (PDF/XLSX) la genera el backend en
// `reporte-movimientos-periodo/exportar/` (ver `exportStockMovementReport`).

/**
 * Tipos de movimiento que acepta el reporte (`MovimientoInventario`). La
 * transferencia se llama `TRANSFERENCIA`, no `TRASPASO` como en la auditoría de
 * existencias (`StockMovement`).
 */
export type StockMovementReportType = "ENTRADA" | "SALIDA" | "AJUSTE" | "TRANSFERENCIA";

/** Categoría contable del inventario movido. */
export type StockCategoriaInventario = "MATERIA_PRIMA" | "EN_PROCESO" | "PRODUCTO_TERMINADO";

/** Filtro de tipo del reporte: un tipo o `TODOS` (todos los tipos). */
export type StockMovementReportTypeFilter = StockMovementReportType | "TODOS";

/**
 * Documento que originó el movimiento, resuelto por el backend
 * (`origen_tipo`). Se tipa abierto: un origen nuevo se muestra con su código.
 */
export type StockMovementOrigenTipo =
  | "PEDIDO"
  | "RECEPCION"
  | "TRANSFERENCIA"
  | "AJUSTE"
  | "OP"
  | "PICKING"
  | "DEVOLUCION"
  | (string & {});

/**
 * Una fila del reporte de movimientos. Es una entidad PROPIA del endpoint de
 * reporte (`/inventarios/movimientos/reporte-movimientos-periodo/`), plana y
 * SIN relación con `StockMovement` (la entidad de `/inventarios/movimientos/`,
 * con snapshots `antes_json`/`despues_json`) — confirmado contra la respuesta
 * real del backend. NO se debe volver a aliasear a `StockMovement`: son formas
 * genuinamente distintas.
 *
 * `movimiento_detalle_id` es el identificador único real de la fila:
 * `movimiento_inventario_id` puede repetirse cuando un mismo movimiento tiene
 * varias líneas de detalle.
 */
export interface StockMovementReportRow {
  movimiento_inventario_id: number;
  movimiento_detalle_id: number;
  tipo_movimiento: StockMovementReportType;
  fecha_movimiento: string;
  // Solo en transferencias (en los demás tipos llegan `null`): de dónde a
  // dónde se movieron las piezas.
  almacen_origen_id?: number | null;
  almacen_origen_nombre?: string | null;
  almacen_destino_id?: number | null;
  almacen_destino_nombre?: string | null;
  // Ubicación de salida y de llegada (una sola en entradas/salidas).
  ubicacion_origen_id?: number | null;
  ubicacion_origen_nombre?: string | null;
  ubicacion_destino_id?: number | null;
  ubicacion_destino_nombre?: string | null;
  // Existencia del SKU antes y después del renglón, en `saldo_nivel`.
  saldo_antes?: string | null;
  saldo_despues?: string | null;
  saldo_nivel?: "UBICACION" | "ALMACEN" | null;
  saldo_negativo?: boolean | null;
  valor_antes?: string | null;
  valor_despues?: string | null;
  cliente_id?: number | null;
  cliente_nombre?: string | null;
  proveedor_id?: number | null;
  proveedor_nombre?: string | null;
  categoria_inventario?: StockCategoriaInventario | null;
  factura_tipo?: "PROVEEDOR" | "CLIENTE" | null;
  factura_id?: number | null;
  factura_folio?: string | null;
  factura_uuid?: string | null;
  poliza_id?: number | null;
  poliza_folio?: string | null;
  lote_id?: number | null;
  motivo_ajuste_clave?: string | null;
  // `null` cuando el backend no puede derivar el almacén del detalle (sin
  // ubicación, recepción ni ajuste de los que tomarlo).
  almacen_id: number | null;
  almacen_codigo: string | null;
  almacen_nombre: string | null;
  ubicacion_id: number | null;
  ubicacion_nombre: string | null;
  producto_id: number;
  producto_variante_id: number | null;
  sku: string | null;
  producto_nombre: string;
  producto_base_nombre: string;
  color: string | null;
  talla: string | null;
  // Campos numéricos que llegan como string decimal del backend (p. ej. "33.0000").
  cantidad: string;
  // Con signo: + entra, − sale. En una transferencia es 0 sin filtro de
  // almacén (no cambia el total) y ± según el almacén filtrado.
  cantidad_signed?: string;
  costo_unitario: string;
  // Con el mismo signo que `cantidad_signed` desde que el backend la manda.
  costo_total: string;
  origen_tipo?: StockMovementOrigenTipo | null;
  origen_folio?: string | null;
  origen_id?: number | null;
  recepcion_folio?: string | null;
  op_folio?: string | null;
  pedido_id: number | null;
  pedido_folio: string | null;
  transferencia_id: number | null;
  transferencia_folio: string | null;
  recepcion_id: number | null;
  ajuste_inventario_id: number | null;
  op_id: number | null;
  // `null` en un movimiento sin usuario.
  usuario_id: number | null;
  usuario_nombre: string | null;
  observaciones: string | null;
  comentarios: string | null;
  motivo_ajuste: string | null;
}

/** Totales del periodo completo (NO paginado). */
export interface StockMovementReportSummary {
  total_movimientos: number;
  total_registros: number;
  // Cantidad agregada; llega como string decimal del backend (p. ej. "10.0000").
  total_cantidad: string;
  // Neto del periodo (entradas − salidas ± ajustes), con signo.
  neto_piezas?: string;
  neto_costo?: string;
  /** Totales por categoría contable (piezas y costo con signo). */
  por_categoria?: Partial<Record<StockCategoriaInventario, StockMovementReportBucket>>;
  por_motivo_ajuste?: Record<string, StockMovementReportBucket>;
  por_tipo?: Record<StockMovementReportTypeBucket, StockMovementReportBucket> & {
    // Solo con `almacen_id`: las transferencias que salen de él y las que entran.
    transferencias: StockMovementReportBucket & {
      salientes?: StockMovementReportBucket;
      entrantes?: StockMovementReportBucket;
    };
  };
}

/** Grupos del desglose `resumen.por_tipo`. */
export type StockMovementReportTypeBucket =
  | "entradas"
  | "salidas"
  | "ajustes_positivos"
  | "ajustes_negativos"
  | "transferencias";

export interface StockMovementReportBucket {
  registros: number;
  piezas: string;
  costo: string;
}

/** Respuesta completa del endpoint (sobre DRF + agregados no paginados). */
export interface StockMovementReportResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: StockMovementReportRow[];
  // ── Campos NO paginados: constantes en todas las páginas de la misma
  //    consulta. Reflejan el periodo completo. ──────────────────────────────
  tipo_movimiento: StockMovementReportTypeFilter;
  fecha_inicio: string;
  fecha_final: string;
  // `almacen_id` solo aparece cuando se filtró por almacén (es opcional).
  filtros: { almacen_id?: number | null; q?: string | null };
  resumen: StockMovementReportSummary;
}

/**
 * Parámetros de consulta. `tipo_movimiento`, `fecha_inicio` y `fecha_final` son
 * SIEMPRE obligatorios (la UI no dispara la consulta hasta tenerlos los tres);
 * `almacen_id` es OPCIONAL (a diferencia de existencias). `page` por defecto
 * `1`; `page_size` por defecto `200`, SIN máximo del lado del backend.
 */
export interface StockMovementReportParams {
  tipo_movimiento: StockMovementReportTypeFilter;
  fecha_inicio: string;
  fecha_final: string;
  almacen_id?: number;
  /** Búsqueda libre del backend: SKU, producto o folio de referencia. */
  q?: string;
  page?: number;
  page_size?: number;
}

/**
 * Parámetros de `reporte-movimientos-periodo/exportar/` (EC-819): los mismos
 * filtros sin la paginación, porque el archivo trae el reporte completo.
 */
export type StockMovementReportExportParams = Omit<StockMovementReportParams, "page" | "page_size">;
