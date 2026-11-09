import type { PaginatedListResponse } from "@/src/utils/serverListAdapters";
import type { Quote } from "./quote.interface";

/**
 * Contrato del listado de cotizaciones en MODO SERVIDOR (EC-811):
 * `GET /ventas/cotizaciones/` paginado y sus acciones `opciones/`, `kpis/` y
 * `tablero/`. Las filas de la lista y del tablero tienen la MISMA forma
 * (`CotizacionDashboardItemSerializer`): `Quote`.
 */

/** `?limit=&offset=` → `{ count, next, previous, results }` (tope 500). */
export type QuoteListResponse = PaginatedListResponse<Quote>;

/** Valor del filtro `cliente` para las cotizaciones guardadas sin cliente. */
export const SIN_CLIENTE = "sin_cliente";

/** Una opción del filtro de cliente: el id del cliente, o `"sin_cliente"`. */
export interface QuoteClienteOption {
  value: number | typeof SIN_CLIENTE;
  /** Razón social del cliente o, si está vacía, su nombre; "Sin cliente". */
  label: string;
}

/**
 * `GET /ventas/cotizaciones/opciones/`: los clientes de TODAS las cotizaciones
 * que el usuario ve (no reacciona a los filtros), en orden alfabético, y al
 * final "Sin cliente" si alguna no tiene.
 */
export interface QuoteFilterOptions {
  cliente: QuoteClienteOption[];
}

/**
 * Conteo e importe de UNA moneda, por código (`moneda: null` = sin moneda).
 * `gran_total` llega como texto con 2 decimales. Sin `moneda_id`: el backend
 * agrupa por código porque cada empresa tiene su propia `Moneda`.
 */
export interface QuoteKpiMoneda {
  moneda: string | null;
  total: number;
  gran_total: string;
}

/** Un estatus del catálogo con su conteo y sus importes por moneda. */
export interface QuoteKpiEstatus {
  estatus: number;
  estatus_label: string;
  total: number;
  por_moneda: QuoteKpiMoneda[];
}

/**
 * `GET /ventas/cotizaciones/kpis/` con los mismos filtros que el listado.
 * `por_estatus` trae SIEMPRE los 5 estatus del catálogo (en cero si no hay);
 * una cotización con un estatus fuera del catálogo cuenta en `total` y en
 * `por_moneda`, pero no en `por_estatus`.
 */
export interface QuoteKpis {
  generado_en: string;
  total: number;
  por_estatus: QuoteKpiEstatus[];
  por_moneda: QuoteKpiMoneda[];
}

/**
 * Una columna de `tablero/`: su `total` (el `count` del listado con
 * `?estatus=N` y los mismos filtros) y sus primeras `por_columna` filas, en el
 * orden por defecto del listado.
 */
export interface QuoteBoardColumn {
  estatus: number;
  estatus_label: string;
  total: number;
  results: Quote[];
}

/** `GET /ventas/cotizaciones/tablero/?por_columna=N`: las 5 columnas, en el orden del catálogo. */
export interface QuoteBoard {
  por_columna: number;
  columnas: QuoteBoardColumn[];
}
