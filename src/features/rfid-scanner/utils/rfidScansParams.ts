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
  /** `unicos=1`: la última lectura de cada EPC. Ausente = sí, como siempre. */
  unicos?: boolean;
}

/** Tope de `limite` en el backend: lo que pide una captura con cursor. */
export const RFID_FEED_CURSOR_LIMIT = 200;

/**
 * `limite` del arranque del cursor (EC-997): esa respuesta solo da el `id`
 * más alto y no entrega nada, así que basta la más reciente. Va sin
 * `solo_match` ni `unicos` (solo con `lector`): el cursor tiene que partir del
 * `id` más alto de TODAS las lecturas del lector, no del más alto de las que
 * ya cruzan con una etiqueta; si no, una lectura vieja que se liga después
 * (`ligar_lecturas_previas`, etiqueta impresa tras leerla) quedaría por
 * encima del cursor y entraría como pieza nueva. Sin cursor el
 * backend ordena por `-created_at, -id`; dos `scans/receive/` simultáneos
 * podrían dejar arriba una fila de `id` menor, y entonces entraría alguna
 * lectura de milisegundos antes de empezar (aceptado).
 */
export const RFID_FEED_BOOTSTRAP_LIMIT = 1;

/**
 * Lo que cambia en cada página de una captura con cursor, sobre sus filtros
 * (`soloMatch`, `lector`): sin cursor todavía, el arranque con
 * `RFID_FEED_BOOTSTRAP_LIMIT` y sin `solo_match` ni `unicos`; con cursor, los
 * filtros de la captura y el tope (`RFID_FEED_CURSOR_LIMIT`) después de ese
 * `id`. Se esparce DESPUÉS de los filtros, para que el arranque los anule.
 */
export const cursorFeedPageParams = (
  cursor: number | null,
): Pick<RfidScansParams, "limite" | "despuesDeId"> & Partial<Pick<RfidScansParams, "soloMatch" | "unicos">> =>
  cursor === null
    ? { limite: RFID_FEED_BOOTSTRAP_LIMIT, soloMatch: false, unicos: false }
    : { limite: RFID_FEED_CURSOR_LIMIT, despuesDeId: cursor };

/**
 * Query string de `scans/`. `unicos=1` salvo con `unicos: false` (solo el
 * arranque del cursor); `solo_match`, `lector`,
 * `despues_de_id` y `limite` solo si se piden. Sin los dos últimos queda
 * exactamente la petición de siempre (la del monitor); las capturas con
 * cursor (Recepción, Surtido y el encuadre) mandan `cursorFeedPageParams`.
 */
export const rfidScansQueryParams = ({ soloMatch, lector, despuesDeId, limite, unicos = true }: RfidScansParams) => ({
  ...(unicos ? { unicos: 1 } : {}),
  ...(soloMatch ? { solo_match: 1 } : {}),
  ...(lector ? { lector } : {}),
  ...(despuesDeId !== undefined ? { despues_de_id: despuesDeId } : {}),
  ...(limite !== undefined ? { limite } : {}),
});

let cursorFeedMounts = 0;

/**
 * Identificador de un montaje de `useRfidCursorScans`, distinto en cada uno.
 * `useId` no sirve: depende de la posición en el árbol y se repite al volver
 * a montar en el mismo lugar (Detener → Iniciar en `ScanCapture`).
 */
export const nextCursorFeedMount = () => {
  cursorFeedMounts += 1;
  return cursorFeedMounts;
};

/**
 * Llave de la consulta con cursor. Lleva el montaje además de la sesión: la
 * sesión vuelve a 0 en cada montaje, y con la misma llave un montaje nuevo
 * heredaría la consulta del anterior mientras su sondeo sigue en vuelo
 * (`gcTime: 0` solo quita consultas inactivas) y, con datos en caché y el
 * `staleTime` global, no arrancaría hasta el siguiente intervalo. Cada llave
 * se quita de la caché en cuanto su consulta queda sin observadores ni sondeo.
 */
export const rfidCursorScansKey = (soloMatch: boolean, lector: number | null, mount: number, session: number) =>
  ["rfid-scans", "cursor", soloMatch, lector, mount, session] as const;

/**
 * Corre un sondeo y avisa cómo terminó (`report(true)` si falló, `false` si
 * respondió), sin cambiar su resultado: el error se vuelve a lanzar. Alimenta
 * el "sin respuesta del lector" de la tira mientras el ÚLTIMO sondeo falla;
 * `isInitialError` solo cubre una sesión que nunca respondió (EC-997).
 */
export const withPollOutcome = async <T>(poll: () => Promise<T>, report: (failed: boolean) => void): Promise<T> => {
  let result: T;
  try {
    result = await poll();
  } catch (error) {
    report(true);
    throw error;
  }
  report(false);
  return result;
};

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
