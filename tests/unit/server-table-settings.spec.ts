import { expect, test } from "@playwright/test";
import {
  booleanFlagParam,
  canonicalServerTableQuery,
  defineServerTable,
  enumParam,
  intRangeParam,
  isServerTableDefaultView,
  isSameServerTableQuery,
  readServerTableState,
  resetServerTableSettingsState,
  serverTableSetting,
  toServerTableCriteria,
  writeServerTableQuery,
} from "@/src/utils/serverTableParams";
import { pageNumberCountAdapter } from "@/src/utils/serverListAdapters";

/**
 * Pruebas unitarias de las extensiones opt-in del modo servidor (EC-867):
 * `intRangeParam`, `booleanFlagParam`, los AJUSTES (`settings`) de una
 * definición y `pageNumberCountAdapter`. La última sección comprueba que una
 * definición SIN ajustes produce exactamente lo mismo que antes.
 */

const withSettings = defineServerTable({
  filters: { estado: enumParam(["A", "B"]), solo: booleanFlagParam },
  settings: {
    semanas: serverTableSetting(intRangeParam(1, 104), 12),
    agrupar: serverTableSetting(enumParam(["variante", "producto"]), "variante"),
  },
  search: { param: "buscar" },
  ordering: { fields: ["vendido", "sku"], default: "-vendido" },
  pageSizes: [20, 50],
  defaultPageSize: 50,
});

const stateOf = (query: string) => {
  const params = new URLSearchParams(query);
  return readServerTableState(withSettings, (key) => params.get(key));
};

test.describe("intRangeParam", () => {
  const param = intRangeParam(1, 104);

  test("acepta enteros dentro del rango, extremos incluidos", () => {
    expect(param.parse("1")).toBe(1);
    expect(param.parse("104")).toBe(104);
    expect(param.parse("12")).toBe(12);
  });

  test("rechaza fuera de rango, decimales, signos y texto", () => {
    for (const raw of ["0", "105", "1.5", "-3", "+3", "abc", "", " 12", "1e2"]) {
      expect(param.parse(raw), raw).toBeNull();
    }
  });

  test("serializa como texto decimal", () => {
    expect(param.serialize(8)).toBe("8");
  });
});

test.describe("booleanFlagParam", () => {
  test('solo "true" cuenta; apagado es ausencia', () => {
    expect(booleanFlagParam.parse("true")).toBe(true);
    for (const raw of ["false", "1", "TRUE", "yes", ""]) {
      expect(booleanFlagParam.parse(raw), raw).toBeNull();
    }
    expect(booleanFlagParam.serialize(true)).toBe("true");
  });
});

test.describe("ajustes (settings)", () => {
  test("sin parámetros cada ajuste toma su default", () => {
    expect(stateOf("").settings).toEqual({ semanas: 12, agrupar: "variante" });
  });

  test("un valor inválido toma el default, sin afectar a los demás", () => {
    expect(stateOf("semanas=0&agrupar=producto").settings).toEqual({
      semanas: 12,
      agrupar: "producto",
    });
    expect(stateOf("semanas=20&agrupar=modelo").settings).toEqual({
      semanas: 20,
      agrupar: "variante",
    });
  });

  test("se envían SIEMPRE al backend, también en su default", () => {
    expect(toServerTableCriteria(withSettings, stateOf(""))).toEqual({
      semanas: "12",
      agrupar: "variante",
      ordering: "-vendido",
    });
    expect(toServerTableCriteria(withSettings, stateOf("semanas=4&estado=A"))).toEqual({
      semanas: "4",
      agrupar: "variante",
      estado: "A",
      ordering: "-vendido",
    });
  });

  test("en la URL solo se escriben si difieren del default", () => {
    const write = (query: string) =>
      writeServerTableQuery(withSettings, stateOf(query), new URLSearchParams()).toString();
    expect(write("semanas=12&agrupar=variante")).toBe("");
    expect(write("semanas=8&agrupar=producto")).toBe("semanas=8&agrupar=producto");
  });

  test("escribir la query reemplaza un ajuste inválido o en su default", () => {
    const current = new URLSearchParams("semanas=999&from=sales&agrupar=variante");
    expect(writeServerTableQuery(withSettings, stateOf(current.toString()), current).toString()).toBe(
      "from=sales",
    );
  });

  test("no cuentan como criterio: la vista con ajustes distintos no es la por defecto", () => {
    expect(isServerTableDefaultView(withSettings, stateOf(""))).toBe(true);
    expect(isServerTableDefaultView(withSettings, stateOf("semanas=12"))).toBe(true);
    expect(isServerTableDefaultView(withSettings, stateOf("semanas=8"))).toBe(false);
  });

  test("la bandera booleana solo aparece encendida", () => {
    expect(stateOf("solo=true").filters).toEqual({ solo: true });
    expect(stateOf("solo=false").filters).toEqual({});
    expect(toServerTableCriteria(withSettings, stateOf("solo=true")).solo).toBe("true");
  });
});

test.describe("definición SIN ajustes: idéntica a antes", () => {
  const plain = defineServerTable({
    filters: { estado: enumParam(["A", "B"]) },
    search: { param: "q" },
    ordering: { fields: ["folio"], default: "-folio", tiebreaker: "-id" },
  });
  const plainStateOf = (query: string) => {
    const params = new URLSearchParams(query);
    return readServerTableState(plain, (key) => params.get(key));
  };

  test("el estado no lleva la clave `settings`", () => {
    expect(plainStateOf("estado=A&q=x&page=2")).toEqual({
      filters: { estado: "A" },
      search: "x",
      ordering: null,
      page: 2,
      pageSize: 20,
    });
  });

  test("criterios, URL y vista por defecto sin cambios", () => {
    expect(toServerTableCriteria(plain, plainStateOf("estado=B"))).toEqual({
      estado: "B",
      ordering: "-folio,-id",
    });
    expect(
      writeServerTableQuery(plain, plainStateOf("estado=B&page=3"), new URLSearchParams("x=1")).toString(),
    ).toBe("x=1&estado=B&page=3");
    expect(isServerTableDefaultView(plain, plainStateOf(""))).toBe(true);
  });
});

test.describe("pageNumberCountAdapter", () => {
  const adapter = pageNumberCountAdapter<{ id: number }>();

  test("pagina con page/page_size", () => {
    expect(adapter.paginationParams({ page: 3, pageSize: 50 })).toEqual({ page: 3, page_size: 50 });
  });

  test("sin `next`: hasMore sale del total; las claves extra no estorban", () => {
    const response = { count: 120, page: 2, page_size: 50, results: [{ id: 1 }], resumen: {} };
    expect(adapter.parse(response, { page: 2, pageSize: 50 })).toEqual({
      rows: [{ id: 1 }],
      total: 120,
      hasMore: true,
    });
    expect(adapter.parse(response, { page: 3, pageSize: 50 }).hasMore).toBe(false);
  });

  test("una página fuera de rango (200 vacío) no es un error de rango", () => {
    expect(adapter.isOutOfRange).toBeUndefined();
  });
});

test.describe("resetServerTableSettingsState", () => {
  test("con todos los ajustes en su default devuelve el MISMO estado (no escribe ni cambia de página)", () => {
    const state = stateOf("page=4&estado=A");
    expect(resetServerTableSettingsState(withSettings, state)).toBe(state);
  });

  test("con algún ajuste distinto vuelve a los defaults y a la página 1, sin tocar filtros", () => {
    const next = resetServerTableSettingsState(withSettings, stateOf("semanas=6&agrupar=producto&page=4&estado=A"));
    expect(next.settings).toEqual({ semanas: 12, agrupar: "variante" });
    expect(next.page).toBe(1);
    expect(next.filters).toEqual({ estado: "A" });
  });
});

test.describe("canonicalServerTableQuery", () => {
  const canonical = (query: string, foreignKeys?: readonly string[]) =>
    canonicalServerTableQuery(withSettings, new URLSearchParams(query), foreignKeys).toString();

  test("quita las claves de la definición hermana y conserva las ajenas a la tabla", () => {
    expect(canonical("agrupar=producto&fabricacion=NO_ALCANZA&from=x", ["fabricacion"])).toBe(
      "from=x&agrupar=producto",
    );
  });

  test("quita un orden fuera de la lista blanca, un filtro inválido y un ajuste en su default", () => {
    expect(canonical("ordering=fabricable&estado=Z&semanas=12&page=2")).toBe("page=2");
  });

  test("una URL ya canónica queda igual (sin importar el orden de sus parámetros)", () => {
    const current = new URLSearchParams("estado=A&semanas=6");
    expect(
      isSameServerTableQuery(canonicalServerTableQuery(withSettings, current), current),
    ).toBe(true);
  });
});
