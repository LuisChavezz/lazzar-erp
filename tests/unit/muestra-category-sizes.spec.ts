import { expect, test } from "@playwright/test";
import {
  findIncompatibleSizes,
  pruneSizeQuantities,
  resolveMuestraSizes,
} from "@/src/features/quotes/utils/muestraCategorySizes";

/**
 * Pruebas unitarias de EC-647: tallas de una muestra según su categoría y qué
 * cantidades se conservan al cambiarla.
 */
const ch = { id: 10, nombre: "CH" };
const m = { id: 11, nombre: "M" };
const g = { id: 12, nombre: "G" };
const uno = { id: 20, nombre: "1" };
const uni = { id: 30, nombre: "UNI" };
const global = [ch, m, g, uno, uni];

test.describe("resolveMuestraSizes", () => {
  test("usa las tallas de la categoría cuando tiene", () => {
    expect(resolveMuestraSizes([ch, m], global)).toEqual([ch, m]);
  });

  test("cae al catálogo global cuando la categoría no tiene tallas", () => {
    expect(resolveMuestraSizes([], global)).toBe(global);
  });
});

test.describe("pruneSizeQuantities", () => {
  test("con una categoría sin tallas (catálogo global) conserva todo", () => {
    const quantities = { 10: "3", 20: "1" };
    expect(pruneSizeQuantities(quantities, resolveMuestraSizes([], global))).toEqual({
      kept: { 10: "3", 20: "1" },
      removedSizeIds: [],
    });
  });

  test("traslape parcial: conserva las que aplican y quita las demás", () => {
    expect(pruneSizeQuantities({ 10: "3", 11: "2", 20: "1" }, [ch, m, g])).toEqual({
      kept: { 10: "3", 11: "2" },
      removedSizeIds: [20],
    });
  });

  test("sin traslape quita todas las capturadas", () => {
    expect(pruneSizeQuantities({ 10: "3", 12: "1" }, [uni])).toEqual({
      kept: {},
      removedSizeIds: [10, 12],
    });
  });

  test("lista vacía: no conserva nada", () => {
    expect(pruneSizeQuantities({ 10: "3" }, [])).toEqual({ kept: {}, removedSizeIds: [10] });
  });

  test("una entrada vacía que ya no aplica se descarta sin contarla como quitada", () => {
    expect(pruneSizeQuantities({ 10: "", 11: "  ", 12: "2" }, [g])).toEqual({
      kept: { 12: "2" },
      removedSizeIds: [],
    });
  });

  test("una talla que ya no aplica con cantidad 0 no cuenta como quitada", () => {
    expect(pruneSizeQuantities({ 10: "0", 11: "00", 12: "2" }, [g])).toEqual({
      kept: { 12: "2" },
      removedSizeIds: [],
    });
  });

  test("conserva tal cual una cantidad inválida de una talla que aplica", () => {
    expect(pruneSizeQuantities({ 10: "1.5" }, [ch]).kept).toEqual({ 10: "1.5" });
  });
});

test.describe("findIncompatibleSizes", () => {
  test("lista las tallas capturadas fuera de la categoría, con nombre y cantidad", () => {
    expect(findIncompatibleSizes({ 10: "2", 30: "5" }, [uni], global)).toEqual([
      { id: 10, nombre: "CH", cantidad: "2" },
    ]);
  });

  test("sin nombre conocido muestra el id", () => {
    expect(findIncompatibleSizes({ 99: "1" }, [uni], global)).toEqual([
      { id: 99, nombre: "#99", cantidad: "1" },
    ]);
  });

  test("una talla fuera de la categoría con cantidad 0 no se marca", () => {
    expect(findIncompatibleSizes({ 10: "0", 30: "5" }, [uni], global)).toEqual([]);
  });

  test("sin cantidades no hay incompatibles", () => {
    expect(findIncompatibleSizes(undefined, [uni], global)).toEqual([]);
  });
});
