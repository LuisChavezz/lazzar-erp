import { expect, test } from "@playwright/test";
import {
  getCategoriaLineaLabel,
  groupCategoriesByLinea,
  SIN_LINEA_LABEL,
} from "@/src/features/product-categories/constants/categoriaLinea";

test.describe("getCategoriaLineaLabel", () => {
  test("la etiqueta del backend para cada línea conocida", () => {
    expect(getCategoriaLineaLabel("ROPA_FRIO")).toBe("Ropa de frío");
    expect(getCategoriaLineaLabel("EPP")).toBe("EPP");
  });

  test("vacía o ausente = sin línea (materia prima)", () => {
    expect(getCategoriaLineaLabel("")).toBe(SIN_LINEA_LABEL);
    expect(getCategoriaLineaLabel(null)).toBe(SIN_LINEA_LABEL);
    expect(getCategoriaLineaLabel(undefined)).toBe(SIN_LINEA_LABEL);
  });

  test("una línea que el front no conoce se muestra cruda, no como materia prima", () => {
    expect(getCategoriaLineaLabel("NUEVA")).toBe("NUEVA");
  });
});

test.describe("groupCategoriesByLinea", () => {
  const cat = (id: number, linea: string) => ({ id, linea });

  test("grupos en el orden del catálogo, sin línea al final, conservando el orden interno", () => {
    const groups = groupCategoriesByLinea([
      cat(1, ""),
      cat(2, "EJECUTIVO"),
      cat(3, "INDUSTRIAL"),
      cat(4, "EJECUTIVO"),
      cat(5, "NUEVA"),
    ]);
    expect(groups.map((group) => group.label)).toEqual([
      "Industrial",
      "Ejecutivo",
      "NUEVA",
      SIN_LINEA_LABEL,
    ]);
    expect(groups[1].categories.map((category) => category.id)).toEqual([2, 4]);
    expect(groups.at(-1)?.categories.map((category) => category.id)).toEqual([1]);
  });

  test("omite las líneas sin categorías", () => {
    expect(groupCategoriesByLinea([])).toEqual([]);
    expect(groupCategoriesByLinea([cat(1, "EPP")]).map((group) => group.key)).toEqual(["EPP"]);
  });
});
