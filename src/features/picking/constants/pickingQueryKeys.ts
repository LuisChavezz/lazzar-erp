/** Prefijo de todos los detalles (lo invalida "Actualizar datos" del listado). */
export const PICKING_DETAIL_QUERY_KEY = ["picking-detail"] as const;

/**
 * Detalle de UN picking (`GET /wms/pickings/{id}/`). Fuera del prefijo del
 * listado (`PICKINGS_KEY`) a propósito: el detalle es la forma completa (con
 * renglones) y no se relee cada vez que cambia la lista.
 */
export const pickingDetailQueryKey = (id: number | null) =>
  [...PICKING_DETAIL_QUERY_KEY, id] as const;
