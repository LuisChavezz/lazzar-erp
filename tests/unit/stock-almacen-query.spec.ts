import { expect, test } from "@playwright/test";
import { nextStockAlmacenQuery } from "@/src/features/stock/utils/stockAlmacenQuery";

/**
 * Pruebas unitarias de EC-766: la URL al cambiar de almacén en la pantalla de
 * existencias reinicia la tabla en una sola escritura.
 */

const query = (qs: string) => new URLSearchParams(qs);

test.describe("nextStockAlmacenQuery", () => {
  test("cambia el almacén y quita filtros, búsqueda, orden y página", () => {
    const next = nextStockAlmacenQuery(
      query(
        "almacen=1&nombre=Playera&tipo=PT&color=MARINO&ubicacion=7&existencias=1-10&mes=2026-11&estado=low&search=cierre&ordering=-stock&page=3",
      ),
      4,
    );
    expect(next?.toString()).toBe("almacen=4");
  });

  test("conserva el tamaño de página y los parámetros ajenos a la tabla", () => {
    const next = nextStockAlmacenQuery(query("from=compras&almacen=1&estado=ok&page_size=50"), 2);
    expect(Object.fromEntries(next ?? [])).toEqual({ from: "compras", almacen: "2", page_size: "50" });
  });

  test("descarta un tamaño de página inválido (vuelve al de por defecto)", () => {
    expect(nextStockAlmacenQuery(query("almacen=1&page_size=7"), 2)?.toString()).toBe("almacen=2");
  });

  test("con null quita el almacén y reinicia la tabla", () => {
    expect(nextStockAlmacenQuery(query("almacen=9&estado=ok&page=2"), null)?.toString()).toBe("");
  });

  test("no cambia nada si ya es ese almacén o si ya no hay ninguno", () => {
    expect(nextStockAlmacenQuery(query("almacen=4&estado=ok"), 4)).toBeNull();
    expect(nextStockAlmacenQuery(query("estado=ok"), null)).toBeNull();
  });
});
