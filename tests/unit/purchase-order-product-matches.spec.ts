import { expect, test } from "@playwright/test";
import type { PurchaseOrderOnboardingProducto } from "@/src/features/purchase-orders/interfaces/purchase-order-onboarding.interface";
import { lineFromProducto, lineFromVariante } from "@/src/features/purchase-orders/utils/purchaseOrderLines";
import {
  mergeProductMatches,
  pinSelectedProducts,
  snapshotSelectedProducts,
} from "@/src/features/purchase-orders/utils/purchaseOrderProductMatches";

/**
 * Pruebas unitarias de EC-703: el selector de productos de una OC de materia
 * prima combina el catálogo cargado (recortado en 1000) con la búsqueda en el
 * servidor sin duplicar filas, y nunca deja fuera de la vista un producto
 * marcado.
 */
const producto = (id: number, nombre = `PRODUCTO ${id}`): PurchaseOrderOnboardingProducto => ({
  id,
  codigo: `C-${id}`,
  cod_proscai: `P-${id}`,
  nombre,
  descripcion: null,
  precio_base: 10,
});

const ids = (rows: PurchaseOrderOnboardingProducto[]) => rows.map((p) => p.id);
const known = (...rows: PurchaseOrderOnboardingProducto[]) => new Map(rows.map((p) => [p.id, p] as const));

test.describe("mergeProductMatches", () => {
  test("un producto del catálogo que también devuelve el servidor sale una sola vez", () => {
    const merged = mergeProductMatches([producto(1), producto(2)], [producto(2), producto(3)]);
    expect(ids(merged)).toEqual([1, 2, 3]);
  });

  test("las coincidencias del catálogo van primero y las del servidor conservan su orden", () => {
    const merged = mergeProductMatches([producto(5)], [producto(9), producto(7)]);
    expect(ids(merged)).toEqual([5, 9, 7]);
  });
});

test.describe("pinSelectedProducts", () => {
  test("un marcado que la búsqueda deja fuera queda fijo arriba", () => {
    const marcado = producto(1500, "ENTRETELA 2533F");
    const rows = pinSelectedProducts([producto(1), producto(2)], [lineFromProducto(marcado)], known(marcado));
    expect(ids(rows)).toEqual([1500, 1, 2]);
    expect(rows[0].nombre).toBe("ENTRETELA 2533F");
  });

  test("un marcado que la búsqueda sí incluye no se repite arriba", () => {
    const rows = pinSelectedProducts([producto(1), producto(2)], [lineFromProducto(producto(2))], known());
    expect(ids(rows)).toEqual([1, 2]);
  });

  test("sin datos conocidos, el fijado se arma con los de su renglón", () => {
    const line = lineFromProducto(producto(1500, "ENTRETELA 2533F"));
    const [row] = pinSelectedProducts([], [line], known());
    expect(row).toMatchObject({ id: 1500, nombre: "ENTRETELA 2533F", precio_base: 10 });
  });

  test("los renglones por variante no se fijan como productos", () => {
    const variante = lineFromVariante({
      id: 77,
      sku: "SKU-77",
      producto_id: 3,
      producto_nombre: "CAMISA",
      color: null,
      talla: null,
      precio_base: 1,
    });
    expect(ids(pinSelectedProducts([producto(1)], [variante], known()))).toEqual([1]);
  });
});

test.describe("snapshotSelectedProducts", () => {
  test("\"Ver solo estos\" incluye los productos elegidos en la búsqueda del servidor", () => {
    const catalogo = [producto(1), producto(2), producto(3)];
    const delServidor = producto(1500, "ENTRETELA 2533F");
    const snapshot = snapshotSelectedProducts(
      catalogo,
      [lineFromProducto(delServidor), lineFromProducto(producto(3)), lineFromProducto(producto(1))],
      known(...catalogo, delServidor),
    );
    // Los del catálogo en su orden, después los que no están en él.
    expect(ids(snapshot)).toEqual([1, 3, 1500]);
  });
});
