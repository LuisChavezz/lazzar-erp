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
  costo_unitario: string;
  costo_total: string;
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
}

/** Respuesta completa del endpoint (sobre DRF + agregados no paginados). */
export interface StockMovementReportResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: StockMovementReportRow[];
  // ── Campos NO paginados: constantes en todas las páginas de la misma
  //    consulta. Reflejan el periodo completo. ──────────────────────────────
  tipo_movimiento: StockMovementReportType;
  fecha_inicio: string;
  fecha_final: string;
  // `almacen_id` solo aparece cuando se filtró por almacén (es opcional).
  filtros: { almacen_id?: number };
  resumen: StockMovementReportSummary;
}

/**
 * Parámetros de consulta. `tipo_movimiento`, `fecha_inicio` y `fecha_final` son
 * SIEMPRE obligatorios (la UI no dispara la consulta hasta tenerlos los tres);
 * `almacen_id` es OPCIONAL (a diferencia de existencias). `page` por defecto
 * `1`; `page_size` por defecto `200`, SIN máximo del lado del backend.
 */
export interface StockMovementReportParams {
  tipo_movimiento: StockMovementReportType;
  fecha_inicio: string;
  fecha_final: string;
  almacen_id?: number;
  page?: number;
  page_size?: number;
}

/**
 * Parámetros de `reporte-movimientos-periodo/exportar/` (EC-819): los mismos
 * filtros sin la paginación, porque el archivo trae el reporte completo.
 */
export type StockMovementReportExportParams = Omit<StockMovementReportParams, "page" | "page_size">;
