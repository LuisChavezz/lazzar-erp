import { expect, test } from "@playwright/test";
import {
  areServerTableRangesValid,
  dateParam,
  defineServerTable,
  enumParam,
  readServerTableState,
  toServerTableCriteria,
} from "@/src/utils/serverTableParams";
import {
  fetchAllServerListRows,
  limitOffsetAdapter,
  type PaginatedListResponse,
} from "@/src/utils/serverListAdapters";

/**
 * Pruebas unitarias de EC-720: rangos de fechas en las tablas de servidor
 * (`dateRanges`) y recorrido de todas las páginas para exportar.
 */

const withRange = defineServerTable({
  filters: {
    estatus: enumParam(["1", "2"]),
    fecha_desde: dateParam,
    fecha_hasta: dateParam,
  },
  dateRanges: [{ from: "fecha_desde", to: "fecha_hasta" }],
});

const withoutRange = defineServerTable({
  filters: { fecha_desde: dateParam, fecha_hasta: dateParam },
});

const read = (definition: Parameters<typeof readServerTableState>[0], query: string) => {
  const params = new URLSearchParams(query);
  return readServerTableState(definition, (key) => params.get(key));
};

test.describe("dateRanges en la lectura de la URL", () => {
  test("un rango en orden se conserva", () => {
    const state = read(withRange, "fecha_desde=2026-01-01&fecha_hasta=2026-01-31");
    expect(state.filters).toEqual({ fecha_desde: "2026-01-01", fecha_hasta: "2026-01-31" });
  });

  test("el mismo día en los dos extremos es válido (inclusivo)", () => {
    const state = read(withRange, "fecha_desde=2026-01-15&fecha_hasta=2026-01-15");
    expect(state.filters).toEqual({ fecha_desde: "2026-01-15", fecha_hasta: "2026-01-15" });
  });

  test("un rango invertido descarta los dos extremos y nada más", () => {
    const state = read(withRange, "estatus=2&fecha_desde=2026-02-01&fecha_hasta=2026-01-31");
    expect(state.filters).toEqual({ estatus: "2" });
    expect(toServerTableCriteria(withRange, state)).toEqual({ estatus: "2" });
  });

  test("un solo extremo no se compara", () => {
    expect(read(withRange, "fecha_desde=2026-02-01").filters).toEqual({ fecha_desde: "2026-02-01" });
    expect(read(withRange, "fecha_hasta=2026-01-31").filters).toEqual({ fecha_hasta: "2026-01-31" });
  });

  test("sin `dateRanges` la lectura no cambia (oportunidades y demás)", () => {
    const state = read(withoutRange, "fecha_desde=2026-02-01&fecha_hasta=2026-01-31");
    expect(state.filters).toEqual({ fecha_desde: "2026-02-01", fecha_hasta: "2026-01-31" });
  });
});

test.describe("areServerTableRangesValid", () => {
  test("rechaza solo el rango invertido", () => {
    expect(areServerTableRangesValid(withRange, {})).toBe(true);
    expect(areServerTableRangesValid(withRange, { fecha_desde: "2026-01-01" })).toBe(true);
    expect(
      areServerTableRangesValid(withRange, { fecha_desde: "2026-01-01", fecha_hasta: "2026-12-31" }),
    ).toBe(true);
    expect(
      areServerTableRangesValid(withRange, { fecha_desde: "2026-12-31", fecha_hasta: "2026-01-01" }),
    ).toBe(false);
  });
});

test.describe("fetchAllServerListRows", () => {
  const adapter = limitOffsetAdapter<number>();

  /**
   * Endpoint falso con `limit`/`offset`. `maxLimit` imita el `max_limit` de
   * DRF (recorta `limit` sin avisar); `delays` retrasa respuestas por offset
   * para que lleguen desordenadas; `stopAt` corta el conjunto real (`next:
   * null` y vacío desde ahí) aunque `count` diga más.
   */
  const fakeEndpoint = (
    total: number,
    { maxLimit = Infinity, delays = {}, stopAt }: {
      maxLimit?: number;
      delays?: Record<number, number>;
      stopAt?: number;
    } = {},
  ) => {
    const calls: Record<string, string | number>[] = [];
    const queryFn = async (
      params: Record<string, string | number>,
    ): Promise<PaginatedListResponse<number>> => {
      calls.push(params);
      const offset = Number(params.offset);
      const limit = Math.min(Number(params.limit), maxLimit);
      const end = Math.min(total, stopAt ?? total, offset + limit);
      const results = Array.from({ length: Math.max(0, end - offset) }, (_, i) => offset + i);
      await new Promise((resolve) => setTimeout(resolve, delays[offset] ?? 0));
      const next = end < Math.min(total, stopAt ?? total) ? "next" : null;
      return { count: total, next, previous: null, results };
    };
    return { calls, queryFn };
  };

  test("recorre las páginas con los criterios y junta todas las filas", async () => {
    const { calls, queryFn } = fakeEndpoint(7);
    const rows = await fetchAllServerListRows({
      queryFn,
      adapter,
      criteria: { estatus: "2", ordering: "folio,id" },
      pageSize: 3,
    });
    expect(rows).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(calls).toEqual([
      { estatus: "2", ordering: "folio,id", limit: 3, offset: 0 },
      { estatus: "2", ordering: "folio,id", limit: 3, offset: 3 },
      { estatus: "2", ordering: "folio,id", limit: 3, offset: 6 },
    ]);
  });

  test("un total múltiplo exacto del tamaño no pide una página vacía de más", async () => {
    const { calls, queryFn } = fakeEndpoint(6);
    expect(await fetchAllServerListRows({ queryFn, adapter, criteria: {}, pageSize: 3 })).toHaveLength(6);
    expect(calls).toHaveLength(2);
  });

  test("sin registros hace una sola petición", async () => {
    const { calls, queryFn } = fakeEndpoint(0);
    expect(await fetchAllServerListRows({ queryFn, adapter, criteria: {} })).toEqual([]);
    expect(calls).toEqual([{ limit: 500, offset: 0 }]);
  });

  test("un backend que recorta el límite: avanza por las filas recibidas, sin saltar ni cortar", async () => {
    const { calls, queryFn } = fakeEndpoint(7, { maxLimit: 2 });
    const rows = await fetchAllServerListRows({ queryFn, adapter, criteria: {}, pageSize: 5 });
    expect(rows).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(calls.map((call) => call.offset)).toEqual([0, 2, 4, 6]);
  });

  test("los lotes en paralelo conservan el orden aunque las respuestas lleguen desordenadas", async () => {
    const { calls, queryFn } = fakeEndpoint(10, { delays: { 2: 30, 4: 10, 6: 0, 8: 20 } });
    const rows = await fetchAllServerListRows({ queryFn, adapter, criteria: {}, pageSize: 2 });
    expect(rows).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    // Primera página sola y luego lotes de tres.
    expect(calls).toHaveLength(5);
  });

  test("se detiene cuando el endpoint dice que no hay más (`next: null`)", async () => {
    const { queryFn } = fakeEndpoint(10, { stopAt: 3 });
    // `count` dice 10, pero el conjunto real acaba en 3 (p. ej. filas borradas).
    const rows = await fetchAllServerListRows({ queryFn, adapter, criteria: {}, pageSize: 2 });
    expect(rows).toEqual([0, 1, 2]);
  });

  test("se detiene en una página vacía y descarta las posteriores", async () => {
    const empty: PaginatedListResponse<number> = { count: 9, next: "x", previous: null, results: [] };
    const queryFn = async (params: Record<string, string | number>) => {
      const offset = Number(params.offset);
      if (offset === 3) return empty;
      return { count: 9, next: "x", previous: null, results: [offset, offset + 1, offset + 2] };
    };
    const rows = await fetchAllServerListRows({ queryFn, adapter, criteria: {}, pageSize: 3 });
    expect(rows).toEqual([0, 1, 2]);
  });
});
