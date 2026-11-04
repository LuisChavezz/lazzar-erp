import { expect, test } from "@playwright/test";
import { categoryHasSizes } from "@/src/features/product-categories/utils/categoryHasSizes";

/** EC-758 (nucleo-erp #927): qué categorías tienen tallas que se puedan usar. */
test.describe("categoryHasSizes", () => {
  const active = new Set([4, 5, 11]);

  test("con alguna talla activa, sí", () => {
    expect(categoryHasSizes({ tallas: [4] }, active)).toBe(true);
    expect(categoryHasSizes({ tallas: [99, 5] }, active)).toBe(true);
  });

  test("sin tallas configuradas, no", () => {
    expect(categoryHasSizes({ tallas: [] }, active)).toBe(false);
  });

  test("con todas sus tallas desactivadas (fuera del catálogo activo), no", () => {
    expect(categoryHasSizes({ tallas: [98, 99] }, active)).toBe(false);
  });

  test("con el catálogo activo vacío, ninguna", () => {
    expect(categoryHasSizes({ tallas: [4] }, new Set())).toBe(false);
  });
});
