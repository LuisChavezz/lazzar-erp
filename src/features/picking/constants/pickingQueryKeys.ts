/**
 * Prefijo de las consultas del listado de pickings. La tabla vive en
 * `["pickings", "list", params]` (`useServerTable`) y los indicadores en
 * `["pickings", "kpis", params]`: invalidar este prefijo refresca ambos, así
 * que tarjetas y tabla muestran el mismo momento.
 */
export const PICKINGS_QUERY_KEY = ["pickings"] as const;

/** Indicadores (`kpis/`) de un conjunto de filtros y búsqueda. */
export const pickingKpisQueryKey = (params: Readonly<Record<string, string>>) =>
  [...PICKINGS_QUERY_KEY, "kpis", params] as const;

/** Prefijo de todos los detalles (lo invalida "Actualizar datos" del listado). */
export const PICKING_DETAIL_QUERY_KEY = ["picking-detail"] as const;

/**
 * Detalle de UN picking (`GET /wms/pickings/{id}/`). Fuera del prefijo del
 * listado a propósito: el detalle es la forma completa (con renglones) y no se
 * relee cada vez que cambia la lista.
 */
export const pickingDetailQueryKey = (id: number | null) =>
  [...PICKING_DETAIL_QUERY_KEY, id] as const;

