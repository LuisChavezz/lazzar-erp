import { expect, test } from "@playwright/test";
import { pedidosAfterSucursalChange } from "@/src/features/pre-orders/utils/resurtidoDraft";

/**
 * EC-957: el resurtido solo acepta pedidos de su sucursal (nucleo-erp#1370), así
 * que cambiar la sucursal (o dejarla vacía) descarta lo marcado.
 */
test.describe("pedidosAfterSucursalChange", () => {
  test("otra sucursal descarta lo marcado", () => {
    expect(pedidosAfterSucursalChange("1", "61", [2150])).toEqual([]);
  });

  test("sin sucursal descarta lo marcado", () => {
    expect(pedidosAfterSucursalChange("1", "", [2150])).toEqual([]);
  });

  test("la misma sucursal conserva la selección (misma referencia)", () => {
    const pedidos = [2150];
    expect(pedidosAfterSucursalChange("1", "1", pedidos)).toBe(pedidos);
  });
});
