import { expect, test } from "@playwright/test";
import type { Quote } from "@/src/features/quotes/interfaces/quote.interface";
import type { QuoteBoard, QuoteListResponse } from "@/src/features/quotes/interfaces/quote-list.interface";
import {
  compareBoardOrder,
  mergeBoardColumnRows,
  moveQuoteInBoard,
  removeQuoteFromPage,
} from "@/src/features/quotes/utils/quoteBoardCache";

/**
 * Caché del tablero en modo servidor (EC-809): las filas de una columna con
 * sus "cargar más" y el envío a revisión optimista con los conteos.
 */

const quote = (id: number, estatus: number, createdAt: string | null): Quote =>
  ({ id, estatus, estatus_label: "", created_at: createdAt }) as unknown as Quote;

const page = (results: Quote[], count: number): QuoteListResponse => ({
  count,
  next: null,
  previous: null,
  results,
});

const board = (columns: { estatus: number; total: number; results: Quote[] }[]): QuoteBoard => ({
  por_columna: 20,
  columnas: columns.map((column) => ({ ...column, estatus_label: String(column.estatus) })),
});

test.describe("filas de una columna", () => {
  test("tablero y luego las tandas, sin repetir ids", () => {
    const rows = mergeBoardColumnRows(
      [quote(9, 1, "2026-11-07"), quote(8, 1, "2026-11-06")],
      [page([quote(8, 1, "2026-11-06"), quote(7, 1, "2026-11-05")], 3)],
    );
    expect(rows.map((row) => row.id)).toEqual([9, 8, 7]);
  });

  test("el orden por defecto: más reciente primero, sin fecha al final, -id de desempate", () => {
    const rows = [
      quote(1, 1, null),
      quote(2, 1, "2026-11-01T10:00:00Z"),
      quote(3, 1, "2026-11-01T10:00:00Z"),
      quote(4, 1, "2026-11-02T10:00:00Z"),
    ].sort(compareBoardOrder);
    expect(rows.map((row) => row.id)).toEqual([4, 3, 2, 1]);
  });
});

test.describe("envío a revisión optimista (1 → 2)", () => {
  const moved = quote(5, 1, "2026-11-03T00:00:00Z");
  const before = board([
    { estatus: 1, total: 3, results: [quote(6, 1, "2026-11-04T00:00:00Z"), moved] },
    { estatus: 2, total: 2, results: [quote(7, 2, "2026-11-05T00:00:00Z"), quote(4, 2, "2026-11-01T00:00:00Z")] },
  ]);

  test("sale del origen, entra en su lugar del destino y los conteos cuadran", () => {
    const after = moveQuoteInBoard(before, moved, 1, { estatus: 2, label: "Por Autorizar" });
    const [source, target] = after.columnas;
    expect(source.total).toBe(2);
    expect(source.results.map((row) => row.id)).toEqual([6]);
    expect(target.total).toBe(3);
    expect(target.results.map((row) => row.id)).toEqual([7, 5, 4]);
    expect(target.results[1]).toMatchObject({ estatus: 2, estatus_label: "Por Autorizar" });
    // La suma de los totales no cambia.
    expect(source.total + target.total).toBe(before.columnas[0].total + before.columnas[1].total);
  });

  test("si le toca después de lo cargado y hay más sin cargar, solo cuenta", () => {
    const old = quote(1, 1, "2026-01-01T00:00:00Z");
    const partial = board([
      { estatus: 1, total: 1, results: [old] },
      { estatus: 2, total: 30, results: [quote(7, 2, "2026-11-05T00:00:00Z")] },
    ]);
    const target = moveQuoteInBoard(partial, old, 1, { estatus: 2, label: "Por Autorizar" }).columnas[1];
    expect(target.total).toBe(31);
    expect(target.results.map((row) => row.id)).toEqual([7]);
  });

  test("y se quita de las tandas de la columna de origen", () => {
    expect(removeQuoteFromPage(page([moved, quote(3, 1, null)], 2), 5)?.results.map((r) => r.id)).toEqual([3]);
    expect(removeQuoteFromPage(undefined, 5)).toBeUndefined();
  });
});
