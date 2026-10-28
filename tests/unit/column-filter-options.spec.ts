import { expect, test } from "@playwright/test";
import {
  ALL_FILTER_OPTION,
  buildCatalogFilterOptions,
  optionsFromConfig,
} from "@/src/utils/columnFilterOptions";

/**
 * Pruebas unitarias de EC-621: opciones de los filtros de encabezado que salen
 * de un catálogo del front (spec `options` de `withHeaderFilters`).
 */

test.describe("optionsFromConfig", () => {
  test("una opción por llave, en el orden del catálogo, con etiqueta y punto", () => {
    const config = {
      1: { label: "Sin trabajar", cls: "x", dot: "bg-slate-400" },
      2: { label: "Programado", cls: "y", dot: "bg-amber-500" },
    };
    expect(optionsFromConfig(config)).toEqual([
      { value: "1", label: "Sin trabajar", dotClassName: "bg-slate-400" },
      { value: "2", label: "Programado", dotClassName: "bg-amber-500" },
    ]);
  });

  test("sin `label` usa la llave; sin `dot` no pone punto", () => {
    expect(optionsFromConfig({ A: { label: "A - 2 a 5 días" }, B: {} })).toEqual([
      { value: "A", label: "A - 2 a 5 días", dotClassName: undefined },
      { value: "B", label: "B", dotClassName: undefined },
    ]);
  });

  test("conserva el orden de inserción de llaves de texto", () => {
    const values = optionsFromConfig({ z: { label: "Z" }, a: { label: "A" }, m: { label: "M" } }).map(
      (option) => option.value,
    );
    expect(values).toEqual(["z", "a", "m"]);
  });
});

test.describe("buildCatalogFilterOptions", () => {
  const catalog = [
    { value: "3", label: "Baja" },
    { value: "1", label: "Alta" },
    { value: "2", label: "Media" },
  ];
  const get = (row: { prioridad: number | null }) => row.prioridad;

  test("'Todos' va primero y el catálogo sigue en su orden, aunque no haya filas", () => {
    expect(buildCatalogFilterOptions([], get, catalog)).toEqual([ALL_FILTER_OPTION, ...catalog]);
  });

  test("los valores de las filas fuera del catálogo se agregan al final, sin repetir", () => {
    const rows = [{ prioridad: 5 }, { prioridad: 1 }, { prioridad: 4 }, { prioridad: 5 }, { prioridad: 2 }];
    expect(buildCatalogFilterOptions(rows, get, catalog)).toEqual([
      ALL_FILTER_OPTION,
      ...catalog,
      { value: "5", label: "5" },
      { value: "4", label: "4" },
    ]);
  });

  test("las filas sin valor no agregan opción", () => {
    const rows = [{ prioridad: null }, { prioridad: 1 }];
    expect(buildCatalogFilterOptions(rows, get, catalog)).toEqual([ALL_FILTER_OPTION, ...catalog]);
  });

  test("un valor del catálogo presente en las filas no se duplica", () => {
    const options = buildCatalogFilterOptions([{ prioridad: 3 }, { prioridad: 3 }], get, catalog);
    expect(options.filter((option) => option.value === "3")).toHaveLength(1);
  });
});
