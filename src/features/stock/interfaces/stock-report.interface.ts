// Reporte de existencias por periodo — endpoint paginado del backend.
//
// NOTA: este es el PRIMER endpoint con paginación del lado del servidor del
// proyecto. La respuesta usa el sobre estándar de DRF (`count`/`next`/
// `previous`/`results`) MÁS varios campos agregados NO paginados
// (`fecha_inicio`, `fecha_final`, `filtros`, `resumen`, `resumen_por_almacen`)
// que reflejan TODO el periodo consultado, sin importar en qué página estés.
// No se deben recalcular ni sumar entre páginas: siempre se confía en el valor
// de la respuesta actual.

/** Una fila del reporte: existencias de una variante en un almacén. */
export interface StockReportRow {
  almacen_id: number;
  // El resto de la identidad puede llegar `null`: el renglón sale de la
  // existencia y de la auditoría, y un producto sin variante no trae SKU,
  // color ni talla.
  almacen_codigo: string | null;
  almacen_nombre: string | null;
  producto_id: number | null;
  producto_variante_id: number | null;
  producto_nombre: string | null;
  sku: string | null;
  color: string | null;
  talla: string | null;
  // Cantidades y costos llegan como strings decimales del backend
  // (p. ej. "10.0000"); no se convierten aquí.
  existencia_inicial: string;
  entradas: string;
  salidas: string;
  existencia_final: string;
  costo_unitario_final: string;
  costo_existencia_final: string;
}

/** Totales del periodo completo (NO paginado). */
export interface StockReportSummary {
  existencia_inicial: string;
  entradas: string;
  salidas: string;
  existencia_final: string;
  costo_total_existencia_final: string;
}

/** Resumen del periodo desglosado por almacén (NO paginado). */
export interface StockReportSummaryByWarehouse extends StockReportSummary {
  almacen_id: number;
  almacen_codigo: string;
  almacen_nombre: string;
}

/** Respuesta completa del endpoint (sobre DRF + agregados no paginados). */
export interface StockReportResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: StockReportRow[];
  // ── Campos NO paginados: constantes en todas las páginas de la misma
  //    consulta. Reflejan el periodo completo. ──────────────────────────────
  fecha_inicio: string;
  fecha_final: string;
  // Sin almacenes en el alcance del usuario (p. ej. un almacén ajeno), el
  // backend responde vacío y `filtros` no trae `almacen_id`.
  filtros: { almacen_id?: number };
  resumen: StockReportSummary;
  resumen_por_almacen: StockReportSummaryByWarehouse[];
}

/**
 * Parámetros de consulta. `fecha_inicio`, `fecha_final` y `almacen_id` son
 * SIEMPRE obligatorios (la UI no dispara la consulta hasta tenerlos los tres).
 * `page` por defecto `1`; `page_size` por defecto `200` (si es inválido o
 * negativo el backend cae en silencio a `200`).
 */
export interface StockReportParams {
  fecha_inicio: string;
  fecha_final: string;
  almacen_id: number;
  page?: number;
  page_size?: number;
}

/**
 * Parámetros de `reporte-existencias-periodo/exportar/` (EC-819): los mismos
 * filtros sin la paginación, porque el archivo trae el reporte completo. El
 * almacén es obligatorio también en el backend (400 `almacen` sin él).
 */
export type StockReportExportParams = Omit<StockReportParams, "page" | "page_size">;
