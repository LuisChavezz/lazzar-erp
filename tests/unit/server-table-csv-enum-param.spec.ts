import { expect, test } from "@playwright/test";
import {
  csvEnumParam,
  defineServerTable,
  readServerTableState,
  toServerTableCriteria,
} from "@/src/utils/serverTableParams";

/**
 * Pruebas unitarias de EC-783: codec multivalor (`csvEnumParam`) para los
 * filtros que el backend acepta como lista separada por comas (`estatus` de
 * OC y de pedidos, `clasificacion` de pedidos).
 */

const ESTATUS = ["1", "2", "3", "4", "5", "6"] as const;

test.describe("csvEnumParam", () => {
  const estatus = csvEnumParam(ESTATUS);

  test("acepta uno o varios valores de la lista", () => {
    expect(estatus.parse("3")).toEqual(["3"]);
    expect(estatus.parse("3,4")).toEqual(["3", "4"]);
    expect(estatus.parse("1,2,3,4,5")).toEqual(["1", "2", "3", "4", "5"]);
  });

  test("normaliza el orden al de la lista y quita repetidos", () => {
    expect(estatus.parse("4,3")).toEqual(["3", "4"]);
    expect(estatus.parse("4,3,4")).toEqual(["3", "4"]);
  });

  test("un solo elemento inválido o vacío invalida todo el valor", () => {
    expect(estatus.parse("3,9")).toBeNull();
    expect(estatus.parse("3,")).toBeNull();
    expect(estatus.parse(",3")).toBeNull();
    expect(estatus.parse("")).toBeNull();
    expect(estatus.parse("3 ,4")).toBeNull();
  });

  test("serializa como CSV", () => {
    expect(estatus.serialize(["3", "4"])).toBe("3,4");
  });

  test("ida y vuelta por la URL: llega al backend ya normalizado", () => {
    const definition = defineServerTable({ filters: { estatus } });
    const query = new URLSearchParams({ estatus: "4,3" });
    const state = readServerTableState(definition, (key) => query.get(key));
    expect(state.filters.estatus).toEqual(["3", "4"]);
    expect(toServerTableCriteria(definition, state)).toEqual({ estatus: "3,4" });
  });

  test("un valor inválido en la URL se trata como ausente", () => {
    const definition = defineServerTable({ filters: { estatus } });
    const query = new URLSearchParams({ estatus: "3,7" });
    const state = readServerTableState(definition, (key) => query.get(key));
    expect(state.filters.estatus).toBeUndefined();
    expect(toServerTableCriteria(definition, state)).toEqual({});
  });
});
