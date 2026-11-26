/** Filtros de `GET /wms/etiquetas-rfid/scans/` (nucleo-erp#1331 y #1459). */
export interface RfidScansParams {
  /** Solo lecturas que cruzan con una etiqueta impresa por el ERP. */
  soloMatch: boolean;
  /** Solo las lecturas de este lector (`?lector=`). `null`/ausente = todos, como antes. */
  lector?: number | null;
  /** Solo lecturas con `id` mayor (cursor, EC-982). Sin él, las más recientes como siempre. */
  despuesDeId?: number;
  /** Cuántas lecturas (1-200, default del backend 50). */
  limite?: number;
}

/** Tope de `limite` en el backend: lo que pide una captura con cursor. */
export const RFID_FEED_CURSOR_LIMIT = 200;

/**
 * Query string de `scans/`. Siempre `unicos=1`; `solo_match`, `lector`,
 * `despues_de_id` y `limite` solo si se piden. Sin los dos últimos queda
 * exactamente la petición de siempre (la que usan el monitor, Recepción y
 * Surtido).
 */
export const rfidScansQueryParams = ({ soloMatch, lector, despuesDeId, limite }: RfidScansParams) => ({
  unicos: 1,
  ...(soloMatch ? { solo_match: 1 } : {}),
  ...(lector ? { lector } : {}),
  ...(despuesDeId !== undefined ? { despues_de_id: despuesDeId } : {}),
  ...(limite !== undefined ? { limite } : {}),
});

/**
 * Un paso del cursor de una captura (EC-982). La primera respuesta (`cursor`
 * `null`) solo fija el punto de partida: el `id` más alto que ya existe (0 sin
 * lecturas) y no entrega nada, así que lo leído antes de empezar nunca se
 * manda. Las siguientes entregan las lecturas posteriores al cursor y lo
 * avanzan al `id` más alto visto.
 */
export const advanceFeedCursor = <T extends { id: number }>(
  cursor: number | null,
  scans: readonly T[],
): { cursor: number; fresh: T[] } => {
  const highest = scans.reduce((max, scan) => (scan.id > max ? scan.id : max), cursor ?? 0);
  if (cursor === null) return { cursor: highest, fresh: [] };
  return { cursor: highest, fresh: scans.filter((scan) => scan.id > cursor) };
};
