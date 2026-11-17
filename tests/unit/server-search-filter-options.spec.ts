import { expect, test } from "@playwright/test";
import { ALL_FILTER_OPTION } from "@/src/utils/columnFilterOptions";
import {
  buildServerSearchFilterOptions,
  serverSearchHiddenCount,
} from "@/src/utils/serverSearchFilterOptions";

/**
 * EC-897: opciones del filtro de encabezado con búsqueda en el servidor
 * (`ServerSearchHeaderFilter`). Lo elegido sigue a la vista aunque la búsqueda
 * vigente no lo incluya, sin repetirse y sin colarse si ya no es lo activo.
 */

const opt = (value: string, label = `Producto ${value}`) => ({ value, label });

test.describe("buildServerSearchFilterOptions", () => {
  test("sin filtro: Todos y las coincidencias, en su orden", () => {
    expect(
      buildServerSearchFilterOptions({ results: [opt("3"), opt("1")], activeValue: undefined }),
    ).toEqual([ALL_FILTER_OPTION, opt("3"), opt("1")]);
  });

  test("el elegido va tras Todos aunque la búsqueda no lo traiga", () => {
    expect(
      buildServerSearchFilterOptions({
        results: [opt("3"), opt("1")],
        selected: opt("9"),
        activeValue: "9",
      }),
    ).toEqual([ALL_FILTER_OPTION, opt("9"), opt("3"), opt("1")]);
  });

  test("si la búsqueda también lo trae, aparece una sola vez", () => {
    expect(
      buildServerSearchFilterOptions({
        results: [opt("3"), opt("9"), opt("1")],
        selected: opt("9"),
        activeValue: "9",
      }),
    ).toEqual([ALL_FILTER_OPTION, opt("9"), opt("3"), opt("1")]);
  });

  test("una resolución de otro valor (atrasada) no se agrega", () => {
    expect(
      buildServerSearchFilterOptions({
        results: [opt("3")],
        selected: opt("9"),
        activeValue: "4",
      }),
    ).toEqual([ALL_FILTER_OPTION, opt("3")]);
    expect(
      buildServerSearchFilterOptions({ results: [opt("3")], selected: opt("9"), activeValue: undefined }),
    ).toEqual([ALL_FILTER_OPTION, opt("3")]);
  });

  test("sin resultados ni elegido: solo Todos", () => {
    expect(buildServerSearchFilterOptions({ results: [], activeValue: undefined })).toEqual([
      ALL_FILTER_OPTION,
    ]);
  });
});

test.describe("serverSearchHiddenCount", () => {
  test("cuenta contra los resultados crudos, no contra el menú con la selección fijada", () => {
    // La búsqueda trajo 3 (el elegido entre ellos) de 3: no falta ninguno,
    // aunque el menú pinte el elegido aparte y solo 2 debajo.
    const results = [opt("9"), opt("3"), opt("1")];
    const options = buildServerSearchFilterOptions({ results, selected: opt("9"), activeValue: "9" });
    expect(options.length - 2).toBe(2);
    expect(serverSearchHiddenCount(3, results.length)).toBe(0);
  });

  test("lo que no llegó en la página", () => {
    expect(serverSearchHiddenCount(130, 50)).toBe(80);
    expect(serverSearchHiddenCount(50, 50)).toBe(0);
  });

  test("sin total no hay aviso", () => {
    expect(serverSearchHiddenCount(undefined, 50)).toBeUndefined();
  });
});
