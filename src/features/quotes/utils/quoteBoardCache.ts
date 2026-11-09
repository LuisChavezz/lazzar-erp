import type { Quote } from "../interfaces/quote.interface";
import type { QuoteBoard, QuoteListResponse } from "../interfaces/quote-list.interface";

/**
 * Operaciones PURAS sobre la caché del tablero (`tablero/` + los "cargar más"
 * de cada columna). Sin React: las usa `useQuoteBoard` y las prueban las
 * pruebas unitarias.
 */

/** Filas cargadas de UNA columna: las del tablero y luego las de "cargar más", sin repetir ids. */
export const mergeBoardColumnRows = (
  boardRows: readonly Quote[],
  morePages: readonly QuoteListResponse[] | undefined,
): Quote[] => {
  const seen = new Set<number>();
  const rows: Quote[] = [];
  for (const row of [...boardRows, ...(morePages ?? []).flatMap((page) => page.results)]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    rows.push(row);
  }
  return rows;
};

/**
 * Orden por defecto del listado y del tablero: `created_at` descendente (sin
 * fecha al final) y `-id` de desempate. Negativo si `a` va antes que `b`.
 */
export const compareBoardOrder = (a: Quote, b: Quote): number => {
  const timeA = a.created_at ? Date.parse(a.created_at) : Number.NaN;
  const timeB = b.created_at ? Date.parse(b.created_at) : Number.NaN;
  const hasA = Number.isFinite(timeA);
  const hasB = Number.isFinite(timeB);
  if (hasA !== hasB) return hasA ? -1 : 1;
  if (hasA && hasB && timeA !== timeB) return timeB - timeA;
  return b.id - a.id;
};

/**
 * Mueve una cotización de columna en la respuesta de `tablero/` (envío a
 * revisión optimista, 1/4 → 2), manteniendo los conteos:
 *
 * - En la columna de origen sale de sus filas (si estaba) y su `total` baja 1.
 * - En la de destino su `total` sube 1 y entra en su lugar del orden por
 *   defecto, con el estatus nuevo. Si ese lugar queda DESPUÉS de lo cargado y
 *   la columna tiene más sin cargar, no se pinta: le tocaría a un "cargar más".
 *
 * El servidor reconcilia al terminar la mutación (se invalida `["quotes"]`).
 */
export const moveQuoteInBoard = (
  board: QuoteBoard,
  quote: Quote,
  sourceEstatus: number,
  target: { estatus: number; label: string },
): QuoteBoard => ({
  ...board,
  columnas: board.columnas.map((column) => {
    if (column.estatus === sourceEstatus) {
      const results = column.results.filter((row) => row.id !== quote.id);
      return { ...column, total: Math.max(0, column.total - 1), results };
    }
    if (column.estatus === target.estatus) {
      const moved: Quote = { ...quote, estatus: target.estatus, estatus_label: target.label };
      const rest = column.results.filter((row) => row.id !== quote.id);
      const index = rest.findIndex((row) => compareBoardOrder(moved, row) < 0);
      const hasUnloaded = column.total > rest.length;
      let results = rest;
      if (index >= 0) results = [...rest.slice(0, index), moved, ...rest.slice(index)];
      else if (!hasUnloaded) results = [...rest, moved];
      return { ...column, total: column.total + 1, results };
    }
    return column;
  }),
});

/** Quita una cotización de UNA página de "cargar más" de una columna. */
export const removeQuoteFromPage = (
  page: QuoteListResponse | undefined,
  quoteId: number,
): QuoteListResponse | undefined =>
  page && { ...page, results: page.results.filter((row) => row.id !== quoteId) };
