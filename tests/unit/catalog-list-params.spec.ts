import { expect, test } from "@playwright/test";
import {
  CATALOG_PRICE_RANGE_OPTIONS,
  productsTable,
  productVariantsTable,
  toCatalogListApiParams,
  withUrlPrefix,
} from "@/src/features/products/utils/catalogListParams";
import {
  readServerTableState,
  toServerTableCriteria,
  writeServerTableQuery,
} from "@/src/utils/serverTableParams";

/**
 * EC-897: contrato de las tablas de catálogo en modo servidor con
 * `catalogo/producto/` y `catalogo/producto-variante/` (EC-896).
 */

/** ¿En qué rangos cae un precio, según los parámetros que se envían? */
const rangesFor = (price: number) =>
  CATALOG_PRICE_RANGE_OPTIONS.filter(({ value }) => {
    const params = toCatalogListApiParams({ rango_precio: value });
    // Mismo criterio que el backend: mínimo inclusivo, máximo exclusivo.
    const min = params.precio_base_min === undefined ? -Infinity : Number(params.precio_base_min);
    const max = params.precio_base_max === undefined ? Infinity : Number(params.precio_base_max);
    return price >= min && price < max;
  }).map(({ value }) => value);

test.describe("toCatalogListApiParams", () => {
  test("cada rango se traduce a precio_base_min/max", () => {
    expect(toCatalogListApiParams({ rango_precio: "hasta-100" })).toEqual({
      precio_base_max: "100",
    });
    expect(toCatalogListApiParams({ rango_precio: "100-500" })).toEqual({
      precio_base_min: "100",
      precio_base_max: "500",
    });
    expect(toCatalogListApiParams({ rango_precio: "mas-500" })).toEqual({
      precio_base_min: "500",
    });
  });

  test("los límites caen en exactamente un rango, sin huecos", () => {
    expect(rangesFor(0)).toEqual(["hasta-100"]);
    expect(rangesFor(99.99)).toEqual(["hasta-100"]);
    expect(rangesFor(100)).toEqual(["100-500"]);
    expect(rangesFor(499.99)).toEqual(["100-500"]);
    expect(rangesFor(500)).toEqual(["mas-500"]);
    expect(rangesFor(100000)).toEqual(["mas-500"]);
  });

  test("el resto de parámetros pasa igual y rango_precio nunca llega al backend", () => {
    expect(
      toCatalogListApiParams({ q: "camisa", linea: "SIN_LINEA", limit: 20, offset: 0, rango_precio: "mas-500" }),
    ).toEqual({ q: "camisa", linea: "SIN_LINEA", limit: 20, offset: 0, precio_base_min: "500" });
    expect(toCatalogListApiParams({ rango_precio: "otro" })).toEqual({});
  });
});

test.describe("productsTable", () => {
  test("línea: las del catálogo y SIN_LINEA, exactas", () => {
    const read = (linea: string) =>
      readServerTableState(productsTable, (key) => (key === "linea" ? linea : null)).filters;
    expect(read("SIN_LINEA")).toEqual({ linea: "SIN_LINEA" });
    expect(read("ROPA_FRIO")).toEqual({ linea: "ROPA_FRIO" });
    expect(read("sin_linea")).toEqual({});
    expect(read("")).toEqual({});
  });

  test("criterios con los nombres del endpoint y el desempate por id", () => {
    const query = new URLSearchParams(
      "categoria_producto=7&con_cod_proscai=false&rango_precio=100-500&q=tela&ordering=-categoria_producto__linea",
    );
    const state = readServerTableState(productsTable, (key) => query.get(key));
    expect(toServerTableCriteria(productsTable, state)).toEqual({
      categoria_producto: "7",
      con_cod_proscai: "false",
      rango_precio: "100-500",
      q: "tela",
      ordering: "-categoria_producto__linea,-id",
    });
  });

  test("sin orden elegido manda el del backend; Estado y Nombre no son filtros", () => {
    const query = new URLSearchParams("activo=false&nombre=x");
    const state = readServerTableState(productsTable, (key) => query.get(key));
    expect(toServerTableCriteria(productsTable, state)).toEqual({ ordering: "-created_at,-id" });
  });
});

test.describe("productVariantsTable", () => {
  test("filtros de variantes y orden por defecto -id sin duplicar el desempate", () => {
    const query = new URLSearchParams("activo=true&producto=12&color=3&talla=5&ordering=talla__nombre");
    const state = readServerTableState(productVariantsTable, (key) => query.get(key));
    expect(toServerTableCriteria(productVariantsTable, state)).toEqual({
      activo: "true",
      producto: "12",
      color: "3",
      talla: "5",
      ordering: "talla__nombre,-id",
    });
    const empty = readServerTableState(productVariantsTable, () => null);
    expect(toServerTableCriteria(productVariantsTable, empty)).toEqual({ ordering: "-id" });
  });

  test("un campo fuera de la lista blanca no se envía", () => {
    const state = readServerTableState(productVariantsTable, (key) =>
      key === "ordering" ? "cod_proscai" : null,
    );
    expect(toServerTableCriteria(productVariantsTable, state).ordering).toBe("-id");
  });
});

test.describe("withUrlPrefix", () => {
  test("lee y escribe con prefijo; al backend van sin él", () => {
    const definition = withUrlPrefix(productsTable, "prod_");
    const query = new URLSearchParams("q=ajena&page=3&prod_q=tela&prod_page=2&prod_linea=EPP");
    const state = readServerTableState(definition, (key) => query.get(key));
    expect(state.search).toBe("tela");
    expect(state.page).toBe(2);
    expect(toServerTableCriteria(definition, state)).toMatchObject({ q: "tela", linea: "EPP" });
    const written = writeServerTableQuery(definition, { ...state, page: 1 }, query);
    // Los parámetros de otra tabla (sin prefijo) no se tocan.
    expect(written.get("q")).toBe("ajena");
    expect(written.get("page")).toBe("3");
    expect(written.get("prod_page")).toBeNull();
  });
});
