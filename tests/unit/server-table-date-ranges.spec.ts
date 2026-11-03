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
  const fakeEndpoint = (total: number) => {
    const calls: Record<string, string | number>[] = [];
    const queryFn = async (
      params: Record<string, string | number>,
    ): Promise<PaginatedListResponse<number>> => {
      calls.push(params);
      const offset = Number(params.offset);
      const limit = Number(params.limit);
      const results = Array.from({ length: Math.max(0, Math.min(limit, total - offset)) }, (_, i) => offset + i);
      return { count: total, next: null, previous: null, results };
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
});
