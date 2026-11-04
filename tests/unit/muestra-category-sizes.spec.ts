import { expect, test } from "@playwright/test";
import {
  findIncompatibleSizes,
  getMuestraSizesBlock,
  getSettledDraftIds,
  INCOMPATIBLE_SIZES_ERROR,
  MUESTRA_SIZES_EMPTY,
  MUESTRA_SIZES_ERROR,
  MUESTRA_SIZES_PENDING,
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
    const categorySizes = [ch, m];
    const resolved = resolveMuestraSizes(categorySizes, global);
    expect(resolved.sizes).toBe(categorySizes);
    expect(resolved).toMatchObject({ status: null, restricted: true });
  });

  test("sin categoría usa el catálogo global, sin restringir", () => {
    const resolved = resolveMuestraSizes(null, global);
    expect(resolved.sizes).toBe(global);
    expect(resolved).toMatchObject({ status: null, restricted: false });
  });

  test("con categoría sin tallas NO cae al catálogo global: ninguna y `empty` (#927)", () => {
    // También es el caso de una categoría con todas sus tallas desactivadas: la
    // lista por categoría solo trae activas y llega vacía.
    expect(resolveMuestraSizes([], global)).toEqual({ sizes: [], status: "empty", restricted: true });
  });
});

test.describe("pruneSizeQuantities", () => {
  test("sin categoría (catálogo global) conserva todo", () => {
    const quantities = { 10: "3", 20: "1" };
    expect(pruneSizeQuantities(quantities, resolveMuestraSizes(null, global).sizes)).toEqual({
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

test.describe("getSettledDraftIds", () => {
  const sizesByDraft = new Map([
    [-1, { status: null }],
    [-2, { status: "loading" as const }],
    [-3, { status: "error" as const }],
    [-4, { status: "empty" as const }],
  ]);

  test("no poda mientras la lista carga o falló", () => {
    expect(getSettledDraftIds([-2, -3], sizesByDraft)).toEqual([]);
  });

  test("no poda contra una categoría sin tallas: se perdería todo lo capturado", () => {
    expect(getSettledDraftIds([-4], sizesByDraft)).toEqual([]);
  });

  test("poda la muestra cuya lista ya está lista", () => {
    expect(getSettledDraftIds(new Set([-1, -2]), sizesByDraft)).toEqual([-1]);
  });

  test("olvida la muestra que ya se quitó", () => {
    expect(getSettledDraftIds([-9], sizesByDraft)).toEqual([-9]);
  });
});

test.describe("getMuestraSizesBlock", () => {
  test("mientras carga espera sin error", () => {
    expect(getMuestraSizesBlock("loading", 0)).toBe(MUESTRA_SIZES_PENDING);
  });

  test("si la lista no cargó, bloquea con su error (no como lista vacía)", () => {
    expect(getMuestraSizesBlock("error", 0)).toBe(MUESTRA_SIZES_ERROR);
  });

  test("con una categoría sin tallas, bloquea con su error (#927)", () => {
    expect(getMuestraSizesBlock("empty", 0)).toBe(MUESTRA_SIZES_EMPTY);
  });

  test("con tallas fuera de la categoría, bloquea", () => {
    expect(getMuestraSizesBlock(null, 2)).toBe(INCOMPATIBLE_SIZES_ERROR);
  });

  test("con la lista lista y sin incompatibles, deja confirmar", () => {
    expect(getMuestraSizesBlock(null, 0)).toBeNull();
  });

  test("tallas ajenas en 0 no bloquean", () => {
    const incompatible = findIncompatibleSizes({ 10: "0", 30: "2" }, [uni], global);
    expect(getMuestraSizesBlock(null, incompatible.length)).toBeNull();
  });
});
