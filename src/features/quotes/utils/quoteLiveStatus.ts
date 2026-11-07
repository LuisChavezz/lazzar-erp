/**
 * Estatus VIVO de la cotización de un diálogo de fila (autorizar, rechazar,
 * ver), para decidir si el diálogo sigue aplicando. Puro: lo usa
 * `useLiveQuoteStatus` y lo prueban las pruebas unitarias.
 *
 * Con el listado y el tablero en modo servidor la vista ya no tiene TODAS las
 * cotizaciones: una fila que sale de la página (otro orden, otra página, una
 * cotización nueva que la empuja) NO cambió de estatus. Por eso la ausencia de
 * la fila en lo cargado nunca cuenta, y "ya no existe" solo lo dice el detalle
 * (`GET /ventas/cotizaciones/{id}/` → 404/403).
 *
 * Fuentes, ambas posteriores a la apertura del diálogo (lo anterior no dice
 * nada del estado de ahora):
 * - `loadedRow`: la fila en lo que la vista tiene cargado (página del
 *   listado, columnas del tablero). La foto del diálogo se tomó de ahí, así
 *   que lo cargado es igual o más nuevo que la foto.
 * - `detail`: el detalle, leído al abrir el diálogo. Solo cuenta si se leyó
 *   DESPUÉS de abrirlo (`updatedAt >= openedAt`): un detalle en caché de antes
 *   podría traer un estatus viejo.
 *
 * Un cambio de estatus que diga CUALQUIERA de las dos fuentes es real (las dos
 * son de después de abrir); si ninguna lo dice, la cotización sigue como en la
 * foto. Lo que ninguna fuente ve todavía lo decide el backend al enviar (400).
 */

export interface LiveQuoteStatusSources {
  /** Estatus de la foto tomada al abrir el diálogo. */
  snapshotEstatus: number;
  /** Momento (ms) en que se abrió el diálogo. */
  openedAt: number;
  /** La fila en lo cargado por la vista, o `undefined` si no está ahí. */
  loadedRow?: { estatus: number };
  /** Último detalle leído con éxito, con su `dataUpdatedAt`. */
  detail?: { estatus: number; updatedAt: number };
  /** `errorUpdatedAt` del último 404/403 del detalle, si lo hubo. */
  detailGoneAt?: number;
}

/** `null` = la cotización ya no existe o ya no es visible para el usuario. */
export type LiveQuoteStatus = { estatus: number } | null;

export const resolveLiveQuoteStatus = ({
  snapshotEstatus,
  openedAt,
  loadedRow,
  detail,
  detailGoneAt,
}: LiveQuoteStatusSources): LiveQuoteStatus => {
  const freshDetail = detail !== undefined && detail.updatedAt >= openedAt ? detail : undefined;
  const isGone =
    detailGoneAt !== undefined &&
    detailGoneAt >= openedAt &&
    (freshDetail === undefined || detailGoneAt > freshDetail.updatedAt);
  if (isGone) return null;
  if (freshDetail && freshDetail.estatus !== snapshotEstatus) return { estatus: freshDetail.estatus };
  if (loadedRow && loadedRow.estatus !== snapshotEstatus) return { estatus: loadedRow.estatus };
  return { estatus: snapshotEstatus };
};
