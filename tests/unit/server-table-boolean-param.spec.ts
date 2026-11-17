import { expect, test } from "@playwright/test";
import {
  booleanParam,
  defineServerTable,
  readServerTableState,
  toServerTableCriteria,
  writeServerTableQuery,
} from "@/src/utils/serverTableParams";

/**
 * EC-897: codec booleano con sus DOS valores (`booleanParam`), para filtros
 * "con / sin" donde `false` es una opción (`?con_cod_proscai=false` = sin
 * código), a diferencia de `booleanFlagParam`, que solo representa `true`.
 */

test.describe("booleanParam", () => {
  test("lee solo true y false exactos", () => {
    expect(booleanParam.parse("true")).toBe(true);
    expect(booleanParam.parse("false")).toBe(false);
    for (const raw of ["", "1", "0", "TRUE", "False", " true", "si", "yes"]) {
      expect(booleanParam.parse(raw)).toBeNull();
    }
  });

  test("escribe true y false", () => {
    expect(booleanParam.serialize(true)).toBe("true");
    expect(booleanParam.serialize(false)).toBe("false");
  });

  const table = defineServerTable({ filters: { con_cod_proscai: booleanParam } });

  test("false sobrevive a la URL y llega al backend", () => {
    const state = readServerTableState(table, (key) =>
      key === "con_cod_proscai" ? "false" : null,
    );
    expect(state.filters).toEqual({ con_cod_proscai: false });
    expect(toServerTableCriteria(table, state)).toEqual({ con_cod_proscai: "false" });
    expect(writeServerTableQuery(table, state, new URLSearchParams()).toString()).toBe(
      "con_cod_proscai=false",
    );
  });

  test("un valor inválido en la URL se trata como ausente", () => {
    const state = readServerTableState(table, (key) => (key === "con_cod_proscai" ? "0" : null));
    expect(state.filters).toEqual({});
    expect(toServerTableCriteria(table, state)).toEqual({});
  });
});
