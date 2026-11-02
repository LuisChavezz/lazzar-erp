import { expect, test } from "@playwright/test";
import {
  countPricedLines,
  proveedorDefaultMonedaId,
  resolveProveedorChange,
} from "@/src/features/purchase-orders/utils/supplierDefaultMoneda";
import { lineFromProducto } from "@/src/features/purchase-orders/utils/purchaseOrderLines";
import type {
  PurchaseOrderOnboardingData,
  PurchaseOrderOnboardingProveedor,
} from "@/src/features/purchase-orders/interfaces/purchase-order-onboarding.interface";

/**
 * Pruebas unitarias de EC-689: la "Nueva OC" preselecciona la moneda del
 * proveedor solo si está en el catálogo, y pide confirmación únicamente cuando
 * la moneda cambia y ya hay renglones con precio.
 */

const MXN = 1;
const USD = 2;
const INACTIVA = 9;

const proveedor = (id: number, moneda_id: number | null): PurchaseOrderOnboardingProveedor => ({
  id,
  codigo: `P${id}`,
  nombre: `Proveedor ${id}`,
  razon_social: `Proveedor ${id}`,
  rfc: "XAXX010101000",
  moneda_id,
  moneda__codigo_iso: moneda_id === null ? null : "XXX",
});

const data: PurchaseOrderOnboardingData = {
  user: { id: 1, email: "a@b.c" },
  empresa_id: 1,
  catalogos: {
    sucursales: [],
    monedas: [
      { id: MXN, codigo_iso: "MXN", nombre: "Peso" },
      { id: USD, codigo_iso: "USD", nombre: "Dólar" },
    ],
  },
  busqueda: {
    proveedores: [proveedor(10, MXN), proveedor(20, USD), proveedor(30, INACTIVA), proveedor(40, null)],
    productos: [],
    variantes: [],
  },
};

test.describe("proveedorDefaultMonedaId", () => {
  test("devuelve la moneda del proveedor si está en el catálogo", () => {
    expect(proveedorDefaultMonedaId(data, 20)).toBe(USD);
  });

  test("null si la moneda no está en el catálogo, no trae moneda, no existe o es 0", () => {
    expect(proveedorDefaultMonedaId(data, 30)).toBeNull();
    expect(proveedorDefaultMonedaId(data, 40)).toBeNull();
    expect(proveedorDefaultMonedaId(data, 99)).toBeNull();
    expect(proveedorDefaultMonedaId(data, 0)).toBeNull();
  });
});

test.describe("resolveProveedorChange", () => {
  const base = { onboardingData: data, currentMoneda: MXN };

  test("pisa una moneda elegida a mano, sin confirmar si no hay renglones con precio", () => {
    expect(resolveProveedorChange({ ...base, nextProveedor: 20, pricedLineCount: 0 })).toEqual({
      moneda: USD,
      needsConfirmation: false,
    });
  });

  test("confirma solo si la moneda cambia y hay renglones con precio", () => {
    expect(resolveProveedorChange({ ...base, nextProveedor: 20, pricedLineCount: 2 })).toEqual({
      moneda: USD,
      needsConfirmation: true,
    });
    expect(resolveProveedorChange({ ...base, nextProveedor: 10, pricedLineCount: 2 })).toEqual({
      moneda: MXN,
      needsConfirmation: false,
    });
  });

  test("sin moneda válida o al volver a 0, deja la moneda y no confirma", () => {
    for (const nextProveedor of [0, 30, 40]) {
      expect(resolveProveedorChange({ ...base, nextProveedor, pricedLineCount: 3 })).toEqual({
        moneda: null,
        needsConfirmation: false,
      });
    }
  });
});

test("countPricedLines cuenta solo precios mayores a 0", () => {
  const lines = [1, 2, 3, 4].map((id) =>
    lineFromProducto({ id, codigo: null, cod_proscai: "", nombre: `P${id}`, descripcion: null, precio_base: 0 }),
  );
  const [a, b, c] = lines.map((l) => l.key);
  expect(countPricedLines(lines, { [a]: "12.50", [b]: "0.00", [c]: "" })).toBe(1);
});
