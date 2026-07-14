import { v1_api } from "@/src/api/v1.api";
import { StockItem } from "../interfaces/stock.interface";
import type {
  StockReportParams,
  StockReportResponse,
} from "../interfaces/stock-report.interface";
import type {
  StockMovementReportParams,
  StockMovementReportResponse,
} from "../interfaces/stock-movement-report.interface";

export interface StockItemsFilters {
  almacen_id?: number;
  producto_variante_id?: number;
}

export const getStockItems = async (filters?: StockItemsFilters): Promise<StockItem[]> => {
  
  // Construir query params dinámicamente según los filtros proporcionados.
  const params = new URLSearchParams();
  if (filters?.almacen_id) params.append("almacen_id", String(filters.almacen_id));
  if (filters?.producto_variante_id) params.append("producto_variante_id", String(filters.producto_variante_id));

  const query = params.toString();
  const url = `/inventarios/existencias/${query ? `?${query}` : ""}`;

  const response = await v1_api.get<StockItem[]>(url);
  return response.data;
}

/**
 * Resuelve el reporte COMPLETO (todas las filas del periodo) para un endpoint
 * de reporte paginado en UNA sola petición con `page_size` deliberadamente
 * enorme. Compartido por `getFullStockReport`/`getFullStockMovementReport`:
 * ambos endpoints tienen exactamente el mismo contrato de "sin tope de
 * `page_size`" y la misma salvaguarda de fallar fuerte si el backend, pese a
 * no documentar un tope, paginara y devolviera menos filas que `count` (el PDF
 * saldría INCOMPLETO en silencio si no se detectara).
 */
const fetchFullPaginatedReport = async <
  TParams,
  TResponse extends { count: number; next: string | null; previous: string | null; results: unknown[] },
>(
  fetchFn: (params: TParams & { page: number; page_size: number }) => Promise<TResponse>,
  params: TParams,
  pageSize: number,
): Promise<TResponse> => {
  const response = await fetchFn({ ...params, page: 1, page_size: pageSize });

  if (response.results.length < response.count) {
    throw new Error(
      "El servidor devolvió el reporte paginado y no se pudieron traer todas las filas. Intenta acotar el periodo y exporta de nuevo.",
    );
  }

  // Conjunto totalmente materializado: `next`/`previous` ya no aplican.
  return { ...response, next: null, previous: null };
};

/**
 * Reporte de existencias por periodo (paginado del lado del servidor).
 *
 * Envía todos los parámetros como query params; axios omite los `undefined`,
 * así que `page`/`page_size` solo viajan cuando el llamador los define.
 * Sin manejo de errores: de eso se encarga el hook (convención del proyecto).
 */
export const getStockReport = async (
  params: StockReportParams,
): Promise<StockReportResponse> => {
  const { data } = await v1_api.get<StockReportResponse>(
    "/inventarios/existencias/reporte-existencias-periodo/",
    { params },
  );
  return data;
};

// El backend ya NO topa `page_size` en este endpoint (confirmado, misma
// situación que movimientos). Por eso la exportación COMPLETA se resuelve en
// UNA sola petición con un `page_size` deliberadamente enorme: sin tope no hay
// múltiples páginas que mezclar, lo que elimina de raíz el riesgo de condición
// de carrera (que el inventario cambie entre peticiones) y la aritmética de
// páginas del enfoque por tandas que este endpoint usaba antes. Mismo valor
// que `STOCK_MOVEMENT_REPORT_EXPORT_PAGE_SIZE`: ningún periodo/almacén
// realista (incluidos los ~40,000 filas observados) se acerca a este número.
const STOCK_REPORT_EXPORT_PAGE_SIZE = 100_000;

/**
 * Reporte de existencias COMPLETO para el contexto de filtros dado: trae TODAS
 * las filas del periodo en una sola petición. Pensado para la exportación a
 * PDF. Los campos NO paginados (`resumen`, `resumen_por_almacen`, fechas,
 * etc.) ya reflejan el periodo completo (no dependen de la página).
 */
export const getFullStockReport = async (
  params: Omit<StockReportParams, "page" | "page_size">,
): Promise<StockReportResponse> =>
  fetchFullPaginatedReport(getStockReport, params, STOCK_REPORT_EXPORT_PAGE_SIZE);

// ─── Reporte de movimientos de inventario por periodo ────────────────────────

/**
 * Reporte de movimientos por periodo (paginado del lado del servidor).
 *
 * Mismo contrato que `getStockReport`: envía todos los parámetros como query
 * params (axios omite los `undefined`, así que `almacen_id`/`page`/`page_size`
 * solo viajan cuando el llamador los define). Sin manejo de errores: de eso se
 * encarga el hook (convención del proyecto).
 */
export const getStockMovementReport = async (
  params: StockMovementReportParams,
): Promise<StockMovementReportResponse> => {
  const { data } = await v1_api.get<StockMovementReportResponse>(
    "/inventarios/movimientos/reporte-movimientos-periodo/",
    { params },
  );
  return data;
};

// Este endpoint tampoco impone un máximo de `page_size` (mismo caso que
// existencias — confirmado mediante inspección del código del backend, fuente
// de DRF y verificación en tiempo de ejecución: ninguno de los dos endpoints
// recorta page_size=100000). Por eso la exportación COMPLETA se resuelve en UNA
// sola petición con un `page_size` deliberadamente enorme: sin tope no hay
// múltiples páginas que mezclar, lo que elimina de raíz el riesgo de condición
// de carrera (que el inventario cambie entre peticiones) y la aritmética de
// páginas del enfoque por tandas. Se eligió un techo alto en lugar de "sin
// límite" para acotar el tamaño de la respuesta a algo razonable para la
// memoria del navegador; ningún periodo/tipo/almacén realista se acerca a este
// número.
const STOCK_MOVEMENT_REPORT_EXPORT_PAGE_SIZE = 100_000;

/**
 * Reporte de movimientos COMPLETO para el contexto de filtros dado: trae TODAS
 * las filas del periodo en una sola petición. Pensado para la exportación a
 * PDF. Los campos NO paginados (`resumen`, fechas, `tipo_movimiento`,
 * `filtros`) ya reflejan el periodo completo (no dependen de la página).
 */
export const getFullStockMovementReport = async (
  params: Omit<StockMovementReportParams, "page" | "page_size">,
): Promise<StockMovementReportResponse> =>
  fetchFullPaginatedReport(
    getStockMovementReport,
    params,
    STOCK_MOVEMENT_REPORT_EXPORT_PAGE_SIZE,
  );