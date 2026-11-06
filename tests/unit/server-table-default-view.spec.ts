import { expect, test } from "@playwright/test";
import {
  defineServerTable,
  enumParam,
  isServerTableDefaultView,
  readServerTableState,
} from "@/src/utils/serverTableParams";
import {
  mesaPedidosTable,
  withoutAmountCriteria,
} from "@/src/features/orders/utils/pedidoListParams";

/**
 * Pruebas unitarias de EC-783: qué llave cuenta como "vista por defecto" para
 * la caché larga de `useServerTable` (`cacheDefaultView`), y la definición sin
 * criterios de importe de las listas de pedidos.
 */

const definition = defineServerTable({
  filters: { estatus: enumParam(["1", "2"]) },
  search: { param: "q" },
  ordering: { fields: ["folio", "fecha"], default: "-fecha" },
  defaultPageSize: 20,
});

const isDefault = (query: string) => {
  const params = new URLSearchParams(query);
  return isServerTableDefaultView(
    definition,
    readServerTableState(definition, (key) => params.get(key)),
  );
};

test.describe("isServerTableDefaultView", () => {
  test("sin parámetros es la vista por defecto", () => {
    expect(isDefault("")).toBe(true);
  });

  test("escribir el orden o el tamaño por defecto sigue siendo la vista por defecto", () => {
    expect(isDefault("ordering=-fecha")).toBe(true);
    expect(isDefault("page_size=20&page=1")).toBe(true);
  });

  test("cada criterio la saca de la vista por defecto", () => {
    expect(isDefault("estatus=1")).toBe(false);
    expect(isDefault("q=acme")).toBe(false);
    expect(isDefault("ordering=folio")).toBe(false);
    expect(isDefault("page=2")).toBe(false);
    expect(isDefault("page_size=50")).toBe(false);
  });

  test("un valor inválido se ignora y no la saca de la vista por defecto", () => {
    expect(isDefault("estatus=9&ordering=nada&page_size=7")).toBe(true);
  });
});

test.describe("withoutAmountCriteria", () => {
  const read = (def: typeof mesaPedidosTable, query: string) => {
    const params = new URLSearchParams(query);
    return readServerTableState(def, (key) => params.get(key));
  };

  test("quita el rango y el orden por importe; lo demás se conserva", () => {
    const sinImportes = withoutAmountCriteria(mesaPedidosTable);
    const state = read(sinImportes, "rango_subtotal=mas-100k&ordering=-subtotal&confirmado=true");
    expect(state.filters).toEqual({ confirmado: "true" });
    expect(state.ordering).toBeNull();
    expect(sinImportes.ordering?.fields).not.toContain("subtotal");
    expect(Object.keys(sinImportes.filters)).not.toContain("rango_subtotal");
  });

  test("solo con importes ocultos: la definición completa sí los lee", () => {
    const state = read(mesaPedidosTable, "rango_subtotal=mas-100k&ordering=-subtotal");
    expect(state.filters).toEqual({ rango_subtotal: "mas-100k" });
    expect(state.ordering).toBe("-subtotal");
  });

  test("devuelve la misma referencia en cada llamada", () => {
    expect(withoutAmountCriteria(mesaPedidosTable)).toBe(withoutAmountCriteria(mesaPedidosTable));
  });

  test("una URL solo con criterios de importe es la vista por defecto sin permiso", () => {
    const sinImportes = withoutAmountCriteria(mesaPedidosTable);
    expect(
      isServerTableDefaultView(sinImportes, read(sinImportes, "rango_subtotal=hasta-10k&ordering=subtotal")),
    ).toBe(true);
  });
});
