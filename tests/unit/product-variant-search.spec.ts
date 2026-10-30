import { expect, test } from "@playwright/test";
import {
  getProductVariantSearchFields,
  matchesProductVariantSearch,
  matchesSearchFields,
} from "@/src/features/product-variants/utils/productVariantSearch";

/**
 * Pruebas unitarias de EC-668: búsqueda de variantes por SKU, nombre, código
 * Proscai y SKU de producción en Movimientos, Nueva OP y Traspasos.
 */
const muestra = {
  sku: "30013-703-G",
  nombre: "TRIPLE FORRO SCT - MARINO - G",
  cod_proscai: "",
  sku_produccion: "MP719-703-G",
};

const gorra = {
  sku: "5000201UNI",
  nombre: "GORRA LEGIONARIO CAQUI",
  cod_proscai: "0247",
  sku_produccion: null,
};

test.describe("getProductVariantSearchFields", () => {
  test("omite sku_produccion null o ausente y cod_proscai vacío", () => {
    expect(getProductVariantSearchFields(gorra)).toEqual([
      "5000201UNI",
      "GORRA LEGIONARIO CAQUI",
      "0247",
    ]);
    expect(getProductVariantSearchFields(muestra)).toEqual([
      "30013-703-G",
      "TRIPLE FORRO SCT - MARINO - G",
      "MP719-703-G",
    ]);
    const sinCampo = { sku: gorra.sku, nombre: gorra.nombre, cod_proscai: gorra.cod_proscai };
    expect(getProductVariantSearchFields(sinCampo)).toEqual([
      "5000201UNI",
      "GORRA LEGIONARIO CAQUI",
      "0247",
    ]);
  });

  test("omite cadenas vacías o solo con espacios", () => {
    expect(
      getProductVariantSearchFields({ ...gorra, cod_proscai: "  ", sku_produccion: "" }),
    ).toEqual(["5000201UNI", "GORRA LEGIONARIO CAQUI"]);
  });
});

test.describe("matchesProductVariantSearch", () => {
  test("casa por cada campo", () => {
    expect(matchesProductVariantSearch(muestra, "30013-703")).toBe(true);
    expect(matchesProductVariantSearch(muestra, "triple forro")).toBe(true);
    expect(matchesProductVariantSearch(gorra, "0247")).toBe(true);
    expect(matchesProductVariantSearch(muestra, "MP719-703-G")).toBe(true);
    expect(matchesProductVariantSearch(muestra, "MP719")).toBe(true);
  });

  test("no distingue mayúsculas y recorta el término", () => {
    expect(matchesProductVariantSearch(muestra, "mp719-703-g")).toBe(true);
    expect(matchesProductVariantSearch(gorra, "  Gorra Legionario ")).toBe(true);
  });

  test("null y vacíos nunca casan como texto", () => {
    expect(matchesProductVariantSearch(gorra, "null")).toBe(false);
    expect(matchesProductVariantSearch({ ...gorra, nombre: "X" }, "undefined")).toBe(false);
  });

  test("no casa a caballo entre dos campos", () => {
    expect(matchesProductVariantSearch(muestra, "G 30013")).toBe(false);
    expect(matchesProductVariantSearch(muestra, "G MP719")).toBe(false);
    expect(matchesProductVariantSearch(gorra, "CAQUI 0247")).toBe(false);
  });

  test("un término vacío casa todo", () => {
    expect(matchesProductVariantSearch(gorra, "")).toBe(true);
    expect(matchesSearchFields([], "   ")).toBe(true);
    expect(matchesSearchFields([], "x")).toBe(false);
  });
});
