import { expect, test } from "@playwright/test";
import { limitOffsetAdapter, pageNumberAdapter } from "@/src/utils/serverListAdapters";
import {
  defineServerTable,
  enumParam,
  readServerTableState,
  serverTableDefaultQuery,
  serverTableListKey,
  serverTableRequest,
  type ServerTableRequest,
} from "@/src/utils/serverTableParams";

/**
 * EC-897 (revisión): llave y consulta de la vista por defecto de una lista en
 * modo servidor (`serverTableDefaultQuery`), para el prefetch de las tarjetas
 * de Configuración. Debe ser la MISMA entrada que lee `useServerTable`, que
 * arma su llave con `serverTableListKey(prefijo, serverTableRequest(...))`.
 */

const table = defineServerTable({
  filters: { linea: enumParam(["EPP", "OTROS"]) },
  search: { param: "q" },
  ordering: { fields: ["nombre"], default: "-created_at", tiebreaker: "-id" },
  defaultPageSize: 20,
});

test.describe("serverTableDefaultQuery", () => {
  test("llave = [...prefijo, 'list', petición] de la vista por defecto", () => {
    const query = serverTableDefaultQuery({
      definition: table,
      adapter: limitOffsetAdapter(),
      queryKey: ["products", "table", 3],
      queryFn: async () => null,
    });
    expect(query.queryKey).toEqual([
      "products",
      "table",
      3,
      "list",
      { ordering: "-created_at,-id", limit: 20, offset: 0 },
    ]);
  });

  test("es la misma llave que arma useServerTable para una URL vacía", () => {
    const adapter = pageNumberAdapter();
    const state = readServerTableState(table, () => null);
    const hookKey = serverTableListKey(["x"], serverTableRequest(table, state, adapter));
    const query = serverTableDefaultQuery({
      definition: table,
      adapter,
      queryKey: ["x"],
      queryFn: async () => null,
    });
    expect(query.queryKey).toEqual(hookKey);
  });

  test("la consulta pide exactamente la petición de la llave", async () => {
    const calls: ServerTableRequest[] = [];
    const query = serverTableDefaultQuery({
      definition: table,
      adapter: limitOffsetAdapter(),
      queryKey: ["x"],
      queryFn: async (params) => {
        calls.push(params);
        return "ok";
      },
    });
    await expect(query.queryFn()).resolves.toBe("ok");
    expect(calls).toEqual([query.queryKey[2]]);
  });
});
