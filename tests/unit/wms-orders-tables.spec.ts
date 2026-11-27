import { expect, test } from "@playwright/test";
import { readServerTableState, toServerTableCriteria } from "@/src/utils/serverTableParams";
import {
  parseWmsOrdersTab,
  porSurtirTable,
  surtidosTable,
  WMS_ORDERS_DEFAULT_TAB,
  WMS_ORDERS_SET_PARAMS,
  withWmsOrdersSetParams,
} from "@/src/features/orders/constants/wmsOrdersTables";

/**
 * EC-993: Pedidos de Almacén. La pestaña sale de `?tab=` y cada pestaña pide
 * su conjunto con parámetros FIJOS (`por_surtir=1`; `estatus=todos&completo=1`)
 * que nada de la URL ni de la tabla puede pisar.
 */

test.describe("parseWmsOrdersTab", () => {
  test("sin parámetro → Por surtir", () => {
    expect(parseWmsOrdersTab(null)).toBe("por-surtir");
    expect(WMS_ORDERS_DEFAULT_TAB).toBe("por-surtir");
  });

  test("valores válidos", () => {
    expect(parseWmsOrdersTab("por-surtir")).toBe("por-surtir");
    expect(parseWmsOrdersTab("surtidos")).toBe("surtidos");
  });

  test("inválidos → Por surtir", () => {
    for (const value of ["", "xyz", "Surtidos", "surtidos ", "constructor", "toString"]) {
      expect(parseWmsOrdersTab(value)).toBe("por-surtir");
    }
  });
});

test.describe("withWmsOrdersSetParams", () => {
  test("los fijos del conjunto ganan a los de la tabla", () => {
    const params = { por_surtir: "0", estatus: "3", completo: "0", q: "P-001", page: 2 };
    expect(withWmsOrdersSetParams("por-surtir", params)).toEqual({
      ...params,
      por_surtir: "1",
    });
    expect(withWmsOrdersSetParams("surtidos", params)).toEqual({
      ...params,
      estatus: "todos",
      completo: "1",
    });
  });

  test("sin parámetros de tabla, solo los fijos", () => {
    expect(withWmsOrdersSetParams("por-surtir", {})).toEqual({ por_surtir: "1" });
    expect(withWmsOrdersSetParams("surtidos", {})).toEqual({ estatus: "todos", completo: "1" });
  });
});

test.describe("la URL no puede cambiar el conjunto", () => {
  // Cada definición tiene sus propios filtros: la petición se arma por caso
  // para que el tipo de `readServerTableState` no se mezcle entre las dos.
  const cases = [
    {
      tab: "por-surtir" as const,
      filterKeys: Object.keys(porSurtirTable.filters),
      prefix: "ps_",
      criteria: (url: URLSearchParams) =>
        toServerTableCriteria(porSurtirTable, readServerTableState(porSurtirTable, (key) => url.get(key))),
    },
    {
      tab: "surtidos" as const,
      filterKeys: Object.keys(surtidosTable.filters),
      prefix: "sd_",
      criteria: (url: URLSearchParams) =>
        toServerTableCriteria(surtidosTable, readServerTableState(surtidosTable, (key) => url.get(key))),
    },
  ];

  for (const { tab, filterKeys, prefix, criteria } of cases) {
    test(`${tab}: ninguna tabla declara los parámetros fijos como filtro`, () => {
      const fixedKeys = Object.values(WMS_ORDERS_SET_PARAMS).flatMap((set) => Object.keys(set));
      for (const key of fixedKeys) expect(filterKeys).not.toContain(key);
    });

    test(`${tab}: ?${prefix}por_surtir / estatus / completo de la URL no llegan a la petición`, () => {
      const url = new URLSearchParams({
        [`${prefix}por_surtir`]: "0",
        [`${prefix}estatus`]: "3",
        [`${prefix}completo`]: "0",
        por_surtir: "0",
        estatus: "3",
        completo: "0",
        [`${prefix}q`]: "abc",
      });
      const request = withWmsOrdersSetParams(tab, criteria(url));
      expect(request).toMatchObject({ ...WMS_ORDERS_SET_PARAMS[tab], q: "abc" });
      if (tab === "por-surtir") {
        expect(request).not.toHaveProperty("estatus");
        expect(request).not.toHaveProperty("completo");
      } else {
        expect(request).not.toHaveProperty("por_surtir");
      }
    });
  }
});
