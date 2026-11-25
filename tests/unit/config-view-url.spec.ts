import { expect, test } from "@playwright/test";
import {
  configViewQuery,
  nextOpenedFromMenu,
  resolveConfigView,
} from "@/src/features/config/utils/configViewUrl";

/** EC-956: la vista abierta de /config vive en `?view=`. */

const VIEWS = ["products", "product-variants", "bom", "suppliers"];

test.describe("resolveConfigView", () => {
  test("devuelve la vista cuando el usuario la ve en el menú", () => {
    expect(resolveConfigView("products", VIEWS)).toBe("products");
    expect(resolveConfigView("suppliers", VIEWS)).toBe("suppliers");
  });

  test("sin parámetro, un valor desconocido o una vista sin permiso → menú", () => {
    expect(resolveConfigView(null, VIEWS)).toBeNull();
    expect(resolveConfigView("garbage", VIEWS)).toBeNull();
    expect(resolveConfigView("", VIEWS)).toBeNull();
    expect(resolveConfigView("Products", VIEWS)).toBeNull();
    expect(resolveConfigView("products", [])).toBeNull();
  });
});

test.describe("configViewQuery", () => {
  test("abrir una vista agrega `view` y conserva los parámetros de las tablas", () => {
    const qs = new URLSearchParams(configViewQuery("?prod_q=camisa&prod_page=2", "products"));
    expect(qs.get("view")).toBe("products");
    expect(qs.get("prod_q")).toBe("camisa");
    expect(qs.get("prod_page")).toBe("2");
  });

  test("cambiar de vista reemplaza `view` sin duplicarla", () => {
    const qs = new URLSearchParams(configViewQuery("view=products&search=acme", "suppliers"));
    expect(qs.getAll("view")).toEqual(["suppliers"]);
    expect(qs.get("search")).toBe("acme");
  });

  test("volver al menú quita solo `view`", () => {
    expect(configViewQuery("?view=products&prod_q=camisa&var_page=3", null)).toBe(
      "prod_q=camisa&var_page=3",
    );
    expect(configViewQuery("?view=bom", null)).toBe("");
    expect(configViewQuery("", null)).toBe("");
  });
});

test.describe("nextOpenedFromMenu", () => {
  test("pasar del menú a una vista (tarjeta o \"adelante\") la marca", () => {
    expect(nextOpenedFromMenu(null, "products", false)).toBe(true);
    expect(nextOpenedFromMenu(null, "suppliers", true)).toBe(true);
  });

  test("un `?view=` desconocido, normalizado a menú, marca la tarjeta abierta después", () => {
    const garbage = resolveConfigView("garbage", VIEWS);
    expect(garbage).toBeNull();
    expect(nextOpenedFromMenu(garbage, resolveConfigView("products", VIEWS), false)).toBe(true);
  });

  test("cualquier otro cambio de vista la quita", () => {
    expect(nextOpenedFromMenu("products", null, true)).toBe(false);
    expect(nextOpenedFromMenu("products", "suppliers", true)).toBe(false);
    expect(nextOpenedFromMenu("products", "suppliers", false)).toBe(false);
  });

  test("sin cambio de vista (la tabla reescribe su URL) se conserva", () => {
    expect(nextOpenedFromMenu("products", "products", true)).toBe(true);
    expect(nextOpenedFromMenu("products", "products", false)).toBe(false);
    expect(nextOpenedFromMenu(null, null, false)).toBe(false);
  });
});
