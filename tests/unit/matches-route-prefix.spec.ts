import { expect, test } from "@playwright/test";
import { matchesRoutePrefix } from "@/src/utils/matchesRoutePrefix";

/** Regla única de coincidencia de rutas (EC-842): ruta exacta o sub-ruta. */

test.describe("matchesRoutePrefix", () => {
  test("la ruta exacta coincide", () => {
    expect(matchesRoutePrefix("/sales", "/sales")).toBe(true);
  });

  test("una sub-ruta coincide a cualquier profundidad", () => {
    expect(matchesRoutePrefix("/sales/quotes", "/sales")).toBe(true);
    expect(matchesRoutePrefix("/sales/quotes/9/edit", "/sales")).toBe(true);
  });

  test("un prefijo que solo comparte letras no coincide", () => {
    expect(matchesRoutePrefix("/salesforce", "/sales")).toBe(false);
    expect(matchesRoutePrefix("/operations/orders-legacy", "/operations/orders")).toBe(false);
  });

  test("una ruta más corta que el prefijo no coincide", () => {
    expect(matchesRoutePrefix("/sales", "/sales/quotes")).toBe(false);
  });

  test("la raíz solo coincide consigo misma", () => {
    expect(matchesRoutePrefix("/", "/")).toBe(true);
    expect(matchesRoutePrefix("/sales", "/")).toBe(false);
  });

  test("la barra final no se normaliza (igual que antes)", () => {
    expect(matchesRoutePrefix("/sales/", "/sales")).toBe(true);
    expect(matchesRoutePrefix("/sales", "/sales/")).toBe(false);
  });
});
