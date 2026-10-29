import { expect, test } from "@playwright/test";
import type { PedidoProgramarRenglon } from "@/src/features/orders/interfaces/pedido-programacion.interface";
import {
  getProgramarStockResumen,
  getTallaCoverage,
  getTallaDiferencia,
  tieneStock,
} from "@/src/features/orders/utils/pedidoProgramarStock";

/**
 * Pruebas unitarias de EC-629: cobertura de existencia de "Programar pedido",
 * calculada solo con `GET /ventas/pedidos/{id}/programar/`.
 */
let nextId = 1;
const renglon = (overrides: Partial<PedidoProgramarRenglon>): PedidoProgramarRenglon => ({
  pedido_detalle_talla_id: nextId++,
  producto: "BATA",
  color: "BLANCO",
  talla: "M",
  sku: "SKU-M",
  variante_id: 1,
  es_muestra: false,
  cantidad: 1,
  servicios: [],
  stock_disponible: 0,
  faltante: 1,
  ...overrides,
});

const conStock = (cantidad: number, stock: number) =>
  renglon({ cantidad, stock_disponible: stock, faltante: Math.max(cantidad - stock, 0) });
const muestra = (cantidad: number) =>
  renglon({ es_muestra: true, sku: null, variante_id: null, cantidad, stock_disponible: null, faltante: null });
const sinSku = (cantidad: number) =>
  renglon({ sku: null, variante_id: null, cantidad, stock_disponible: null, faltante: null });

test.describe("getTallaCoverage", () => {
  const coverage = (cantidad: number, stock: number) => {
    const r = conStock(cantidad, stock);
    if (!tieneStock(r)) throw new Error("sin stock");
    return getTallaCoverage(r);
  };

  test("cubierta si el stock alcanza o sobra", () => {
    expect(coverage(5, 5)).toBe("full");
    expect(coverage(5, 9)).toBe("full");
  });

  test("parcial si hay algo de stock pero no alcanza", () => {
    expect(coverage(5, 1)).toBe("partial");
    expect(coverage(5, 4)).toBe("partial");
  });

  test("sin existencia con stock 0", () => {
    expect(coverage(5, 0)).toBe("none");
  });
});

test("getTallaDiferencia es stock menos lo pedido, con signo", () => {
  const sobra = conStock(2, 10);
  const falta = conStock(10, 4);
  if (!tieneStock(sobra) || !tieneStock(falta)) throw new Error("sin stock");
  expect(getTallaDiferencia(sobra)).toBe(8);
  expect(getTallaDiferencia(falta)).toBe(-6);
});

test.describe("getProgramarStockResumen", () => {
  test("null sin tallas o sin ninguna talla con stock", () => {
    expect(getProgramarStockResumen([])).toBeNull();
    expect(getProgramarStockResumen([muestra(3), sinSku(2)])).toBeNull();
  });

  test("el % se redondea hacia abajo y se mide por piezas", () => {
    // Cubiertas: 2 + 4 + 0 = 6 de 17 → 35.29 % → 35.
    const resumen = getProgramarStockResumen([conStock(2, 1942), conStock(10, 4), conStock(5, 0)]);
    expect(resumen?.percent).toBe(35);
    expect(resumen?.fullyCovered).toBe(false);
    expect(resumen?.tallasCubiertas).toBe(1);
    expect(resumen?.tallasMedidas).toBe(3);
    expect(resumen?.piezasFaltantes).toBe(11);
  });

  test("nunca muestra 100 % con faltantes", () => {
    // 399 de 400 → 99.75 % → 99.
    const resumen = getProgramarStockResumen([conStock(399, 399), conStock(1, 0)]);
    expect(resumen?.percent).toBe(99);
    expect(resumen?.fullyCovered).toBe(false);
  });

  test("las tallas de muestra quedan fuera de la cuenta y no impiden el pedido cubierto", () => {
    const resumen = getProgramarStockResumen([conStock(2, 10), muestra(4)]);
    expect(resumen?.percent).toBe(100);
    expect(resumen?.tallasMedidas).toBe(1);
    expect(resumen?.tallasMuestra).toBe(1);
    expect(resumen?.tallasSinSku).toBe(0);
    expect(resumen?.fullyCovered).toBe(true);
    expect(resumen?.pedidoCubierto).toBe(true);
  });

  test("una talla de catálogo sin SKU impide afirmar que el pedido está cubierto", () => {
    const resumen = getProgramarStockResumen([conStock(2, 10), sinSku(3), sinSku(1)]);
    expect(resumen?.fullyCovered).toBe(true);
    expect(resumen?.tallasSinSku).toBe(2);
    expect(resumen?.pedidoCubierto).toBe(false);
  });
});
