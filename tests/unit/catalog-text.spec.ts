import { expect, test } from "@playwright/test";
import { catalogText } from "@/src/utils/catalogText";

/** La regla única del texto de un código de catálogo (celda, búsqueda y opción de filtro). */
test.describe("catalogText", () => {
  test("la etiqueta del catálogo cuando la hay", () => {
    expect(catalogText("Abierto", "abierto")).toBe("Abierto");
  });

  test("el código crudo cuando el catálogo no lo conoce", () => {
    expect(catalogText(null, "escalado")).toBe("escalado");
    expect(catalogText(undefined, "escalado")).toBe("escalado");
  });

  test("\"—\" sin valor", () => {
    expect(catalogText(null, null)).toBe("—");
    expect(catalogText(null, "")).toBe("—");
    expect(catalogText(null, undefined)).toBe("—");
  });
});
