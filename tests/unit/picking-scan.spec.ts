import { expect, test } from "@playwright/test";
import {
  anyScannable,
  findRowByScan,
  groupByProduct,
  normalizeScanCode,
} from "@/src/features/picking/utils/pickingScan";
import type { PickingOnboardingTalla } from "@/src/features/picking/interfaces/picking-onboarding.interface";

const talla = (over: Partial<PickingOnboardingTalla>): PickingOnboardingTalla =>
  ({
    pedido_detalle: 1,
    pedido_detalle_talla: 1,
    producto: 10,
    producto_nombre: "CAMISA",
    producto_variante: null,
    producto_variante_nombre: null,
    talla: 1,
    talla_nombre: "CH",
    color: 5,
    color_nombre: "MARINO",
    cantidad_pedida: "10",
    cantidad_ya_asignada: "0",
    cantidad_ya_surtida: "0",
    cantidad_pendiente: "10",
    existencia_fisica: "10",
    existencia_reservada: "0",
    existencia_disponible: "10",
    maximo_picking_permitido: "10",
    ...over,
  }) as PickingOnboardingTalla;

test("normaliza separadores y mayúsculas", () => {
  expect(normalizeScanCode(" 1018/800/ch ")).toBe("1018800CH");
  expect(normalizeScanCode("1018-800-CH")).toBe("1018800CH");
});

test("encuentra la talla por SKU sin importar el formato", () => {
  const rows = [
    talla({ pedido_detalle_talla: 1, producto_variante_sku: "1018/800/CH" }),
    talla({ pedido_detalle_talla: 2, producto_variante_sku: "1018/800/M", talla_nombre: "M" }),
  ];
  expect(findRowByScan(rows, "1018800M", () => true)?.pedido_detalle_talla).toBe(2);
  expect(findRowByScan(rows, "9999", () => true)).toBeNull();
});

test("con el mismo código en varias tallas gana la primera con cupo", () => {
  const rows = [
    talla({ pedido_detalle_talla: 1, producto_cod_proscai: "0348" }),
    talla({ pedido_detalle_talla: 2, producto_cod_proscai: "0348" }),
  ];
  expect(findRowByScan(rows, "0348", (r) => r.pedido_detalle_talla === 2)?.pedido_detalle_talla).toBe(2);
  // Sin cupo en ninguna: la primera, para avisar "talla completa".
  expect(findRowByScan(rows, "0348", () => false)?.pedido_detalle_talla).toBe(1);
});

test("sin códigos no hay modo scanner; agrupa por producto + color", () => {
  const rows = [
    talla({ pedido_detalle_talla: 1 }),
    talla({ pedido_detalle_talla: 2, talla_nombre: "M" }),
    talla({ pedido_detalle_talla: 3, color: 6, color_nombre: "NEGRO" }),
  ];
  expect(anyScannable(rows)).toBe(false);
  expect(groupByProduct(rows).map((g) => g.rows.length)).toEqual([2, 1]);
});

test("materia prima sin variante se reconoce por código del producto", () => {
  const rows = [talla({ pedido_detalle_talla: 7, producto_codigo: "MP-0012" })];
  expect(findRowByScan(rows, "MP0012", () => true)?.pedido_detalle_talla).toBe(7);
  expect(anyScannable(rows)).toBe(true);
});
