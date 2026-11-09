/**
 * Llaves de las consultas de `GET /ventas/cotizaciones/` y sus acciones.
 *
 * TODAS cuelgan de `QUOTES_QUERY_KEY`: las mutaciones de cotizaciones (Ventas,
 * Mesa de Control, oportunidades, recompra de pedidos) invalidan ese prefijo,
 * así que lista, tablero, KPIs, opciones y recientes se refrescan juntos sin
 * que ninguna mutación tenga que conocerlas. El detalle va aparte
 * (`["quote", id, source]`).
 */
export const QUOTES_QUERY_KEY = ["quotes"] as const;

/** `opciones/`: catálogo del filtro de cliente (todo lo visible, sin filtros). */
export const QUOTE_FILTER_OPTIONS_QUERY_KEY = [...QUOTES_QUERY_KEY, "opciones"] as const;

/** `kpis/` con sus filtros (`{}` = todas las cotizaciones visibles). */
export const quoteKpisQueryKey = (params: Readonly<Record<string, string>>) =>
  [...QUOTES_QUERY_KEY, "kpis", params] as const;

/** `tablero/` con sus filtros (hoy solo `q`). */
export const quoteBoardQueryKey = (params: Readonly<Record<string, string>>) =>
  [...QUOTES_QUERY_KEY, "tablero", params] as const;

/**
 * Las páginas de "cargar más" de UNA columna del tablero, con los mismos
 * filtros que el tablero (prefijo de `quoteBoardColumnBatchesQueryKey`). Segmento propio
 * (`"tablero-columna"`) y no bajo `"tablero"`: así la llave del tablero no es
 * prefijo de las columnas y escribir una no toca la otra.
 */
export const quoteBoardColumnQueryKey = (
  params: Readonly<Record<string, string>>,
  estatus: number,
) => [...QUOTES_QUERY_KEY, "tablero-columna", params, estatus] as const;

/** Las tandas pedidas de "cargar más" de una columna (todas en una consulta). */
export const quoteBoardColumnBatchesQueryKey = (
  params: Readonly<Record<string, string>>,
  estatus: number,
  batches: number,
) => [...quoteBoardColumnQueryKey(params, estatus), batches] as const;

/** Las más recientes del dashboard de `/sales`. */
export const RECENT_QUOTES_QUERY_KEY = [...QUOTES_QUERY_KEY, "recientes"] as const;
