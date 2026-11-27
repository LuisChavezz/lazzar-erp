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

/** Sesión de una captura con cursor: qué lector se lee y en qué sesión va. */
export interface CursorFeedSession {
  enabled: boolean;
  lector: number | null;
  session: number;
}

/**
 * Siguiente sesión de una captura con cursor. Empieza una nueva (y con ella un
 * cursor nuevo) al encender la lectura y al cambiar de lector mientras está
 * encendida, `null` → lector incluido (el catálogo carga después del primer
 * render). El cursor de un lector no sirve para otro: si el anterior llevaba
 * días sin leer, `despues_de_id` con su `id` traería todo lo que el nuevo leyó
 * desde entonces (EC-997). Apagar o cambiar de lector en pausa no empieza nada:
 * la sesión empieza al encender. Sin cambios devuelve el mismo objeto.
 */
export const nextCursorFeedSession = (
  prev: CursorFeedSession,
  enabled: boolean,
  lector: number | null,
): CursorFeedSession => {
  if (prev.enabled === enabled && prev.lector === lector) return prev;
  const restart = enabled && (!prev.enabled || prev.lector !== lector);
  return { enabled, lector, session: restart ? prev.session + 1 : prev.session };
};

/**
 * Un paso del cursor de una captura (EC-982). La primera respuesta (`cursor`
 * `null`) solo fija el punto de partida: el `id` más alto que ya existe (0 sin
 * lecturas) y no entrega nada, así que lo leído antes de empezar nunca se
 * manda. Las siguientes entregan las lecturas posteriores al cursor, en orden
 * de `id` ascendente (el orden en que se leyeron), y lo avanzan al `id` más
 * alto visto (`max(id)`, no el primero ni el último de la respuesta).
 */
export const advanceFeedCursor = <T extends { id: number }>(
  cursor: number | null,
  scans: readonly T[],
): { cursor: number; fresh: T[] } => {
  const highest = scans.reduce((max, scan) => (scan.id > max ? scan.id : max), cursor ?? 0);
  if (cursor === null) return { cursor: highest, fresh: [] };
  return {
    cursor: highest,
    fresh: scans.filter((scan) => scan.id > cursor).sort((a, b) => a.id - b.id),
  };
};

/** Cuántas páginas llenas se piden seguidas en un solo sondeo (200 × 25 = 5000 lecturas). */
export const RFID_FEED_MAX_PAGES_PER_POLL = 25;

/**
 * Un sondeo con cursor completo (EC-984): con `despues_de_id` el backend
 * devuelve las lecturas en `id` ASCENDENTE, las primeras `limite`. Si una
 * página viene llena quedan más, así que se pide la siguiente de inmediato,
 * sin esperar al próximo intervalo, hasta que una venga incompleta: una
 * tarima completa frente a la antena se vacía en un solo sondeo.
 *
 * - La primera petición de una sesión (`cursor` `null`) solo fija el cursor y
 *   no pagina (ver `advanceFeedCursor`).
 * - Tope de `maxPages` páginas por sondeo; lo que quede llega en el siguiente.
 * - Un error en la PRIMERA página se propaga (el sondeo falla y el cursor no
 *   se mueve). En una página posterior se corta ahí y se entrega lo ya
 *   recibido, con el cursor en la última página buena: nada se pierde y no hay
 *   un ciclo apretado de reintentos; el siguiente intervalo sigue desde ahí.
 */
export const drainFeedAfterCursor = async <T extends { id: number }>(
  cursor: number | null,
  fetchPage: (cursor: number | null) => Promise<readonly T[]>,
  { limit = RFID_FEED_CURSOR_LIMIT, maxPages = RFID_FEED_MAX_PAGES_PER_POLL } = {},
): Promise<{ cursor: number; fresh: T[]; pages: number }> => {
  let current = cursor;
  const fresh: T[] = [];
  let pages = 0;
  while (pages < maxPages) {
    let scans: readonly T[];
    try {
      scans = await fetchPage(current);
    } catch (error) {
      if (pages === 0) throw error;
      break;
    }
    pages += 1;
    const isStart = current === null;
    const next = advanceFeedCursor(current, scans);
    fresh.push(...next.fresh);
    current = next.cursor;
    if (isStart || scans.length < limit) break;
  }
  return { cursor: current ?? 0, fresh, pages };
};

/**
 * Bandeja de lecturas nuevas de una captura con cursor. El sondeo deja aquí lo
 * que trajo (en orden) y la captura lo saca. No depende de que la lectura siga
 * encendida ni de la sesión vigente: un sondeo en vuelo cuando el operador
 * pausa (o pausa y reanuda) ya movió el cursor, así que lo que trae se entrega
 * igual; si no, esas piezas no volverían a pedirse nunca.
 */
export class ScanOutbox<T> {
  private items: T[] = [];

  push(items: readonly T[]): void {
    this.items.push(...items);
  }

  /** Todo lo pendiente, en el orden en que llegó; la bandeja queda vacía. */
  take(): T[] {
    const taken = this.items;
    this.items = [];
    return taken;
  }
}
