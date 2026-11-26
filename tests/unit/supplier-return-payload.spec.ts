import { expect, test } from "@playwright/test";
import {
  buildSupplierReturnDetalles,
  initialReturnQuantities,
  pendingQuantity,
} from "@/src/features/supplier-returns/utils/supplierReturnPayload";
import type { SupplierReturnPendingLine } from "@/src/features/supplier-returns/interfaces/supplier-return.interface";

/**
 * EC-951: el alta de una devolución a proveedor manda solo los renglones con
 * cantidad, recortada a lo pendiente de `pendientes/` y a 2 decimales. Corren
 * con `npm run test:unit`.
 */

const line = (calidad_detalle: number, cantidad_pendiente: string): SupplierReturnPendingLine => ({
  calidad_detalle,
  recepcion_detalle: calidad_detalle * 10,
  resultado: "rechazo",
  producto: 1,
  producto_nombre: "Camisa",
  producto_variante_sku: "CAM-M",
  producto_variante_talla: "M",
  producto_variante_color: "Azul",
  cantidad_pendiente,
});

test("lo pendiente: los dos formatos de decimales del backend, y basura como 0", () => {
  expect(pendingQuantity(line(1, "3.00"))).toBe(3);
  expect(pendingQuantity(line(1, "1.5000"))).toBe(1.5);
  expect(pendingQuantity(line(1, "abc"))).toBe(0);
  expect(pendingQuantity(line(1, "-2"))).toBe(0);
});

test("arranca con todo lo pendiente de cada renglón", () => {
  expect(initialReturnQuantities([line(1, "3.00"), line(2, "1.5000"), line(3, "0")])).toEqual({
    1: "3",
    2: "1.5",
    3: "",
  });
});

test("manda solo lo capturado, recortado a lo pendiente y a 2 decimales", () => {
  const lines = [line(1, "3.00"), line(2, "1.5000"), line(3, "4.00")];
  expect(buildSupplierReturnDetalles(lines, { 1: "2", 2: "", 3: "9", 99: "1" })).toEqual([
    { calidad_detalle: 1, cantidad: "2.00" },
    { calidad_detalle: 3, cantidad: "4.00" },
  ]);
  expect(buildSupplierReturnDetalles(lines, { 2: "0.5" })).toEqual([{ calidad_detalle: 2, cantidad: "0.50" }]);
  expect(buildSupplierReturnDetalles(lines, { 1: "0", 2: "abc" })).toEqual([]);
});
