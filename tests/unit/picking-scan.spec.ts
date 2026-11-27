import { expect, test } from "@playwright/test";
import {
  anyScannable,
  findRowByScan,
  groupByProduct,
  leerEnSurtido,
  normalizeScanCode,
} from "@/src/features/picking/utils/pickingScan";
import { PendingQuantities } from "@/src/utils/pendingQuantities";
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

/** Una tanda de la antena (EC-997), como en `PickingLinesPanel`: mismas `quantities` para todas. */
const tandaSurtido = (
  rows: PickingOnboardingTalla[],
  quantities: Record<string, string>,
  max: Record<number, number>,
  codigos: string[],
) => {
  const enVuelo = new PendingQuantities();
  const escritas: Record<string, string> = {};
  const qty = (r: PickingOnboardingTalla) => Number.parseFloat(enVuelo.read(quantities, String(r.pedido_detalle_talla)) ?? "") || 0;
  const maxOf = (r: PickingOnboardingTalla) => max[r.pedido_detalle_talla] ?? 0;
  const resultados = codigos.map((codigo) => {
    const { result, row, cantidad } = leerEnSurtido(rows, codigo, qty, maxOf);
    if (row && cantidad !== undefined) {
      enVuelo.write(quantities, String(row.pedido_detalle_talla), String(cantidad));
      escritas[row.pedido_detalle_talla] = String(cantidad);
    }
    return result;
  });
  return { resultados, escritas };
};

test.describe("tanda de lecturas de la antena (EC-997)", () => {
  const xg = talla({ pedido_detalle_talla: 845, talla_nombre: "XG", producto_variante_sku: "3037100XG" });
  test("450 lecturas en la misma tanda suman 450", () => {
    const { resultados, escritas } = tandaSurtido([xg], {}, { 845: 652 }, Array(450).fill("3037100XG"));
    expect(escritas).toEqual({ 845: "450" });
    expect(resultados.every((r) => r.tone === "ok")).toBe(true);
    expect(resultados[449].detail).toBe("450 de 652");
  });
  test("más lecturas que el techo: suma exactamente hasta el techo y el resto es talla completa", () => {
    const { resultados, escritas } = tandaSurtido([xg], { 845: "640" }, { 845: 652 }, Array(20).fill("3037100XG"));
    expect(escritas).toEqual({ 845: "652" });
    expect(resultados.filter((r) => r.tone === "ok")).toHaveLength(12);
    expect(resultados[12]).toEqual({ tone: "warn", title: "Talla completa", detail: "CAMISA · XG: ya tienes 652 de 652" });
  });
  test("tanda mezclada: desconocido, otra talla y el cupo que pasa a la línea con el mismo código", () => {
    const ch1 = talla({ pedido_detalle_talla: 1, producto_variante_sku: "1018800CH" });
    const ch2 = talla({ pedido_detalle_talla: 2, producto_variante_sku: "1018800CH" });
    const { resultados, escritas } = tandaSurtido([ch1, ch2, xg], {}, { 1: 1, 2: 1, 845: 1 }, [
      "1018800CH",
      "NOEXISTE",
      "1018800CH",
      "3037100XG",
      "1018800CH",
    ]);
    expect(resultados.map((r) => [r.tone, r.title])).toEqual([
      ["ok", "+1 CAMISA · CH"],
      ["error", "No está en este pedido"],
      ["ok", "+1 CAMISA · CH"],
      ["ok", "+1 CAMISA · XG"],
      ["warn", "Talla completa"],
    ]);
    expect(escritas).toEqual({ 1: "1", 2: "1", 845: "1" });
  });
});
