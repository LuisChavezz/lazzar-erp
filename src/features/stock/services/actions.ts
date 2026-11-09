import { v1_api } from "@/src/api/v1.api";
import { readBlobErrorBody } from "@/src/utils/readBlobErrorBody";
import type { PaginatedListResponse } from "@/src/utils/serverListAdapters";
import { StockItem } from "../interfaces/stock.interface";
import type {
  StockPorAlmacenItem,
  StockPorAlmacenResumen,
} from "../interfaces/stock-por-almacen.interface";
import type {
  StockReportExportParams,
  StockReportParams,
  StockReportResponse,
} from "../interfaces/stock-report.interface";
import type {
  StockMovementReportExportParams,
  StockMovementReportParams,
  StockMovementReportResponse,
} from "../interfaces/stock-movement-report.interface";
import type { StockReportExportFormat } from "../utils/stockReportExport";
import type {
  MovementLedgerParams,
  MovementLedgerResponse,
} from "../interfaces/movement-ledger.interface";

export interface StockItemsFilters {
  almacen_id?: number;
  producto_variante_id?: number;
}

export const getStockItems = async (filters?: StockItemsFilters): Promise<StockItem[]> => {
  
  // Construir query params dinámicamente según los filtros proporcionados.
  const params = new URLSearchParams();
  if (filters?.almacen_id) params.append("almacen_id", String(filters.almacen_id));
  if (filters?.producto_variante_id) params.append("producto_variante_id", String(filters.producto_variante_id));
  // Sin `limit` el backend topa en silencio a 200 filas (ordenadas por
  // `fecha_actualizacion` DESC): un almacén grande se vería incompleto sin
  // aviso. `limit=all` quita el tope; un `limit` numérico se topa en 2000.
  params.append("limit", "all");

  const query = params.toString();
  const url = `/inventarios/existencias/${query ? `?${query}` : ""}`;

  const response = await v1_api.get<StockItem[]>(url);
  return response.data;
}

/**
 * Una página de existencias de UN almacén para la pantalla de stock
 * (`GET /inventarios/existencias/por-almacen/`, EC-774). `params` llega ya
 * validado por `useServerTable` (filtros, `search`, `ordering`, `limit`,
 * `offset`); el almacén va aparte porque no es un filtro de la tabla. Siempre
 * viaja `limit`, así que la respuesta es el sobre paginado (sin `limit` el
 * backend devolvería el arreglo completo).
 */
export const getStockPorAlmacenPage = async (
  almacenId: number,
  params: Record<string, string | number>,
): Promise<PaginatedListResponse<StockPorAlmacenItem>> => {
  const { data } = await v1_api.get<PaginatedListResponse<StockPorAlmacenItem>>(
    "/inventarios/existencias/por-almacen/",
    { params: { ...params, almacen_id: almacenId } },
  );
  return data;
};

/**
 * KPIs, `max_stock` y opciones de los filtros de encabezado del almacén
 * completo (`GET /inventarios/existencias/por-almacen/resumen/`, EC-774).
 */
export const getStockPorAlmacenResumen = async (
  almacenId: number,
): Promise<StockPorAlmacenResumen> => {
  const { data } = await v1_api.get<StockPorAlmacenResumen>(
    "/inventarios/existencias/por-almacen/resumen/",
    { params: { almacen_id: almacenId } },
  );
  return data;
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

/**
 * Reporte de existencias COMPLETO en PDF o XLSX, generado por el backend
 * (`reporte-existencias-periodo/exportar/`, EC-814) con los mismos filtros,
 * alcance y cálculo que el JSON de la pantalla, sin paginar. A diferencia del
 * JSON, el almacén es obligatorio (sin él responde 400 `almacen`). Pide el
 * cuerpo como `blob`; si falla, `readBlobErrorBody` deja el JSON del error en
 * `response.data` para que el hook muestre el motivo.
 */
export const exportStockReport = async (
  params: StockReportExportParams,
  formato: StockReportExportFormat,
): Promise<Blob> => {
  try {
    const { data } = await v1_api.get<Blob>(
      "/inventarios/existencias/reporte-existencias-periodo/exportar/",
      { params: { ...params, formato }, responseType: "blob" },
    );
    return data;
  } catch (error) {
    throw await readBlobErrorBody(error);
  }
};

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

/**
 * Reporte de movimientos COMPLETO en PDF o XLSX, generado por el backend
 * (`reporte-movimientos-periodo/exportar/`, EC-814). Mismo contrato que
 * `exportStockReport`, con el almacén opcional: sin `almacen_id` el archivo
 * trae todos los almacenes del alcance, igual que la pantalla.
 */
export const exportStockMovementReport = async (
  params: StockMovementReportExportParams,
  formato: StockReportExportFormat,
): Promise<Blob> => {
  try {
    const { data } = await v1_api.get<Blob>(
      "/inventarios/movimientos/reporte-movimientos-periodo/exportar/",
      { params: { ...params, formato }, responseType: "blob" },
    );
    return data;
  } catch (error) {
    throw await readBlobErrorBody(error);
  }
};

// ─── Auxiliar de movimientos (kardex de una variante) ────────────────────────

/**
 * Auxiliar de movimientos: con `q` busca la variante (una coincidencia ⇒
 * kardex; varias o ninguna ⇒ `opciones`); con `producto_variante` va directo al
 * kardex. Sin paginación y en orden cronológico: el saldo corrido depende de
 * ese orden. Sin manejo de errores: de eso se encarga el hook.
 */
export const getMovementLedger = async (
  params: MovementLedgerParams,
): Promise<MovementLedgerResponse> => {
  const { data } = await v1_api.get<MovementLedgerResponse>(
    "/inventarios/movimientos/auxiliar/",
    { params },
  );
  return data;
};
