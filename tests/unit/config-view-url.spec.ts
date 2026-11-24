import { expect, test } from "@playwright/test";
import { configViewQuery, resolveConfigView } from "@/src/features/config/utils/configViewUrl";

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
