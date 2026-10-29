import { expect, test } from "@playwright/test";
import {
  ALL_FILTER_OPTION,
  filterChipValueLabel,
  nextFilterValueLabels,
  pinActiveFilterOption,
} from "@/src/utils/columnFilterOptions";

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

test.describe("nextFilterValueLabels", () => {
  const prev = { sucursal: { label: "TONELES", value: "61" } };

  test("recuerda la etiqueta con el valor al que nombra", () => {
    expect(nextFilterValueLabels({}, "sucursal", "TONELES", "61")).toEqual(prev);
  });

  test("sin cambios devuelve el mismo objeto", () => {
    expect(nextFilterValueLabels(prev, "sucursal", "TONELES", "61")).toBe(prev);
  });

  test("la opción desapareció pero sigue elegida: conserva la etiqueta", () => {
    expect(nextFilterValueLabels(prev, "sucursal", undefined, "61")).toBe(prev);
  });

  test("otro valor sin etiqueta, o el filtro quitado: la borra", () => {
    expect(nextFilterValueLabels(prev, "sucursal", undefined, "3")).toEqual({});
    expect(nextFilterValueLabels(prev, "sucursal", undefined)).toEqual({});
  });

  test("quien no informa el valor se comporta como siempre", () => {
    const legacy = nextFilterValueLabels({}, "estatus", "Pendiente");
    expect(legacy).toEqual({ estatus: { label: "Pendiente" } });
    expect(nextFilterValueLabels(legacy, "estatus", undefined)).toEqual({});
  });
});

test.describe("filterChipValueLabel", () => {
  test("nombra al valor actual, o no dice a cuál nombra", () => {
    expect(filterChipValueLabel({ label: "TONELES", value: "61" }, "61")).toBe("TONELES");
    expect(filterChipValueLabel({ label: "Pendiente" }, "1")).toBe("Pendiente");
  });

  test("una etiqueta de otro valor no se muestra", () => {
    expect(filterChipValueLabel({ label: "TONELES", value: "61" }, "3")).toBeUndefined();
    expect(filterChipValueLabel(undefined, "3")).toBeUndefined();
  });
});
