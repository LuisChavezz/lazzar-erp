import { v1_api } from "@/src/api/v1.api";
import { StockItem } from "../interfaces/stock.interface";
import type {
  StockReportParams,
  StockReportResponse,
} from "../interfaces/stock-report.interface";

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

// Máximo `page_size` que acepta el backend (cae en silencio a 200 si se excede).
const STOCK_REPORT_MAX_PAGE_SIZE = 2000;

// Tope de peticiones simultáneas al traer las páginas restantes en
// exportaciones grandes: evita lanzar decenas de requests a la vez (límites del
// navegador/backend) sin frenar de forma notable los tamaños realistas.
const STOCK_REPORT_MAX_CONCURRENT_REQUESTS = 5;

// Ejecuta las tareas en tandas de a lo sumo `concurrency` a la vez.
const fetchInChunks = async <T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<T[]> => {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += concurrency) {
    const chunk = tasks.slice(i, i + concurrency);
    results.push(...(await Promise.all(chunk.map((task) => task()))));
  }
  return results;
};

/**
 * Reporte de existencias COMPLETO para el contexto de filtros dado: trae TODAS
 * las filas del periodo, no una sola página. Pensado para la exportación a PDF.
 *
 * Caso común (≤ 2000 filas): una sola petición con `page_size: 2000` basta.
 * Caso raro (> 2000 filas): se pide el resto de páginas en paralelo y se
 * concatenan sus `results`. Los campos NO paginados (`resumen`,
 * `resumen_por_almacen`, fechas, etc.) se toman de la primera respuesta, que ya
 * reflejan el periodo completo (no dependen de la página).
 */
export const getFullStockReport = async (
  params: Omit<StockReportParams, "page" | "page_size">,
): Promise<StockReportResponse> => {
  const first = await getStockReport({
    ...params,
    page: 1,
    page_size: STOCK_REPORT_MAX_PAGE_SIZE,
  });

  if (first.count <= STOCK_REPORT_MAX_PAGE_SIZE) {
    // Todo cupo en una sola página: el conjunto ya está materializado, así que
    // `next`/`previous` no tienen sentido (ver nota abajo).
    return { ...first, next: null, previous: null };
  }

  // Hay más de MAX filas, así que la primera página DEBE traer MAX. Si trajo
  // menos, el backend no respetó `page_size` y la aritmética de páginas de abajo
  // (que asume MAX/página) perdería filas en silencio. Se falla en vez de
  // generar un PDF incompleto.
  if (first.results.length < STOCK_REPORT_MAX_PAGE_SIZE) {
    throw new Error(
      "El servidor no respondió con el tamaño de página esperado. No se pudo generar el reporte completo.",
    );
  }

  const remainingPages = Math.ceil(
    (first.count - STOCK_REPORT_MAX_PAGE_SIZE) / STOCK_REPORT_MAX_PAGE_SIZE,
  );
  // Concurrencia acotada (no un `Promise.all` sin límite) para no saturar con
  // decenas de peticiones simultáneas en periodos muy grandes.
  const additional = await fetchInChunks(
    Array.from(
      { length: remainingPages },
      (_, i) => () =>
        getStockReport({
          ...params,
          page: i + 2,
          page_size: STOCK_REPORT_MAX_PAGE_SIZE,
        }),
    ),
    STOCK_REPORT_MAX_CONCURRENT_REQUESTS,
  );

  const totalFetched =
    first.results.length +
    additional.reduce((sum, r) => sum + r.results.length, 0);

  // Detección de inconsistencia: si el total de filas traídas no coincide con
  // el `count` que prometió la primera página, el inventario cambió entre
  // peticiones (una fila se agregó/eliminó y desplazó los límites de página).
  //
  // RIESGO RESIDUAL (no cerrable solo desde el cliente): un desplazamiento que
  // conserve el mismo total podría duplicar una fila y saltarse otra sin que
  // este chequeo lo note. Cerrarlo requeriría un snapshot consistente del lado
  // del backend (p. ej. un token/timestamp de consulta), que el endpoint no
  // expone hoy. Se detecta el síntoma más común y detectable (conteo distinto)
  // y se falla con un mensaje claro en vez de exportar un PDF silenciosamente
  // incorrecto.
  if (totalFetched !== first.count) {
    throw new Error(
      "El inventario cambió mientras se generaba el reporte. Intenta exportar de nuevo.",
    );
  }

  // Conjunto totalmente materializado: `next`/`previous` de la primera página
  // ya no aplican (apuntarían a "más páginas" de algo que ya está completo).
  return {
    ...first,
    next: null,
    previous: null,
    results: [...first.results, ...additional.flatMap((r) => r.results)],
  };
};