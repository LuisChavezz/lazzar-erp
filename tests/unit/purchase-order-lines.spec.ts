import { expect, test } from "@playwright/test";
import { buildPurchaseOrderDetalle } from "@/src/features/purchase-orders/utils/buildPurchaseOrderDetalle";
import {
  hasVariantSku,
  lineFromDetalle,
  lineFromProducto,
  lineFromVariante,
  seedFromDetalles,
} from "@/src/features/purchase-orders/utils/purchaseOrderLines";
import type { PurchaseOrderDetalle } from "@/src/features/purchase-orders/interfaces/purchase-order.interface";

/**
 * Pruebas unitarias de EC-657: renglones de OC por producto o por variante
 * (SKU). Dos tallas del mismo producto no chocan, un renglón "Sin SKU" convive
 * con los de SKU de su producto, y la edición nunca reenvía una variante como
 * producto.
 */
const detalle = (overrides: Partial<PurchaseOrderDetalle>): PurchaseOrderDetalle => ({
  id: 1,
  producto_id: 8350,
  producto_nombre: "CAMISA",
  producto_variante_id: null,
  producto_variante_sku: null,
  descripcion: "CAMISA",
  cantidad: 1,
  piezas: 1,
  precio: "10.00",
  ...overrides,
});

const variante = (id: number, sku: string, talla: string | null) => ({
  id,
  sku,
  producto_id: 8350,
  producto_nombre: "CAMISA",
  color: "VINO",
  talla,
  precio_base: 0,
});

test.describe("llaves de renglón", () => {
  test("dos tallas del mismo producto y su renglón sin SKU tienen llaves distintas", () => {
    const keys = [
      lineFromVariante(variante(161, "10005032XG", "2XG")).key,
      lineFromVariante(variante(162, "10005033XG", "3XG")).key,
      lineFromDetalle(detalle({})).key,
    ];
    expect(keys).toEqual(["v:161", "v:162", "p:8350"]);
  });

  test("color y talla se muestran solo si se conocen", () => {
    expect(lineFromVariante(variante(161, "A", "2XG")).atributos).toBe("VINO · 2XG");
    expect(lineFromVariante(variante(161, "A", null)).atributos).toBe("VINO");
    expect(lineFromDetalle(detalle({ producto_variante_id: 161, producto_variante_sku: "A" })).atributos).toBeNull();
  });
});

test.describe("buildPurchaseOrderDetalle", () => {
  test("la variante viaja sola y el producto solo en materia prima y renglones sin SKU", () => {
    const lines = [
      lineFromProducto({ id: 14339, codigo: null, cod_proscai: "", nombre: "ANTI-CUT", descripcion: null, precio_base: 270.02 }),
      lineFromDetalle(detalle({})),
      lineFromVariante(variante(161, "10005032XG", "2XG")),
    ];
    const payload = buildPurchaseOrderDetalle(
      lines,
      { "p:14339": 1, "p:8350": 2, "v:161": 3 },
      { "p:14339": "270.02", "p:8350": "99", "v:161": "110.5" },
    );
    expect(payload).toEqual([
      { cantidad: 1, precio: "270.02", descripcion: "ANTI-CUT", producto: 14339 },
      { cantidad: 2, precio: "99.00", descripcion: "CAMISA", producto: 8350 },
      { cantidad: 3, precio: "110.50", descripcion: "CAMISA", producto_variante: 161 },
    ]);
    expect(payload.every((row) => !("producto" in row && "producto_variante" in row))).toBe(true);
  });
});

test.describe("seedFromDetalles", () => {
  test("conserva la variante de cada renglón guardado", () => {
    const seed = seedFromDetalles([
      detalle({ id: 1, producto_variante_id: 161, producto_variante_sku: "10005032XG", cantidad: 2 }),
      detalle({ id: 2, producto_variante_id: 162, producto_variante_sku: "10005033XG", cantidad: 3 }),
      detalle({ id: 3, cantidad: 4 }),
    ]);
    expect(seed.map((s) => [s.line.key, s.line.productoVariante, s.line.sku, s.cantidad])).toEqual([
      ["v:161", 161, "10005032XG", 2],
      ["v:162", 162, "10005033XG", 3],
      ["p:8350", null, null, 4],
    ]);
  });

  test("un renglón repetido queda una vez, con los datos del último", () => {
    const seed = seedFromDetalles([
      detalle({ id: 1, cantidad: 1, precio: "10.00" }),
      detalle({ id: 2, cantidad: 5, precio: "12.00" }),
    ]);
    expect(seed).toHaveLength(1);
    expect([seed[0].cantidad, seed[0].line.precioInicial]).toEqual([5, "12.00"]);
  });
});

test.describe("hasVariantSku", () => {
  test("solo hay columna SKU si algún renglón la tiene", () => {
    expect(hasVariantSku([detalle({}), detalle({ producto_variante_sku: "A" })])).toBe(true);
    expect(hasVariantSku([detalle({})])).toBe(false);
    expect(hasVariantSku([{}])).toBe(false);
  });
});
