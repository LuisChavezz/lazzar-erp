import { expect, test } from "@playwright/test";
import { ALL_FILTER_OPTION } from "@/src/utils/columnFilterOptions";
import { buildServerSearchFilterOptions } from "@/src/utils/serverSearchFilterOptions";

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
