import { expect, test } from "@playwright/test";
import { ALL_FILTER_OPTION, pinActiveFilterOption } from "@/src/utils/columnFilterOptions";

/**
 * Pruebas unitarias de EC-636: el valor elegido en un filtro de encabezado
 * sigue nombrado (chip y menú) aunque las opciones de las filas ya no lo
 * incluyan.
 */

const matriz = { value: "3", label: "MATRIZ" };
const toneles = { value: "61", label: "TONELES" };
const options = [ALL_FILTER_OPTION, matriz, toneles];

test.describe("pinActiveFilterOption", () => {
  test("sin filtro: las opciones tal cual y nada activo", () => {
    expect(pinActiveFilterOption(options, undefined, matriz)).toEqual({ options, active: undefined });
  });

  test("el valor sigue entre las opciones: mismas opciones, misma referencia", () => {
    const result = pinActiveFilterOption(options, "61", undefined);
    expect(result.options).toBe(options);
    expect(result.active).toBe(toneles);
  });

  test("el valor desapareció: el recuerdo se fija después de «Todos»", () => {
    const sinToneles = [ALL_FILTER_OPTION, matriz];
    expect(pinActiveFilterOption(sinToneles, "61", toneles)).toEqual({
      options: [ALL_FILTER_OPTION, toneles, matriz],
      active: toneles,
    });
  });

  test("sin «Todos» en las opciones, el recuerdo va primero", () => {
    expect(pinActiveFilterOption([matriz], "61", toneles).options).toEqual([toneles, matriz]);
  });

  test("un recuerdo de OTRO valor no se usa (catálogo aún cargando)", () => {
    expect(pinActiveFilterOption([ALL_FILTER_OPTION], "61", matriz)).toEqual({
      options: [ALL_FILTER_OPTION],
      active: undefined,
    });
  });
});
