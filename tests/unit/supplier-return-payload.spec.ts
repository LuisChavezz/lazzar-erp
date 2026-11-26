import { expect, test } from "@playwright/test";
import {
  buildSupplierReturnDetalles,
  pendingQuantity,
  reconcileReturnQuantities,
} from "@/src/features/supplier-returns/utils/supplierReturnPayload";
import type { SupplierReturnPendingLine } from "@/src/features/supplier-returns/interfaces/supplier-return.interface";

/**
 * EC-951: las cantidades del alta de una devolución a proveedor siguen la
 * convención de recepciones (EC-900/EC-924): enteros a mano y el pendiente
 * exacto del backend con "Todo", sin redondear. Corren con `npm run test:unit`.
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
  expect(pendingQuantity(line(1, "0.3350"))).toBe(0.335);
  expect(pendingQuantity(line(1, "abc"))).toBe(0);
  expect(pendingQuantity(line(1, "-2"))).toBe(0);
});

test("\"Todo\" manda el cantidad_pendiente del backend tal cual, sin redondear", () => {
  const lines = [line(1, "0.3350"), line(2, "10.5000")];
  // Lo que fija "Todo" es el texto del backend.
  expect(buildSupplierReturnDetalles(lines, { 1: "0.3350", 2: "10.5000" })).toEqual([
    { calidad_detalle: 1, cantidad: "0.3350" },
    { calidad_detalle: 2, cantidad: "10.5000" },
  ]);
  // Un valor igual en número (recortado tras releer) también manda el texto.
  expect(buildSupplierReturnDetalles(lines, { 1: "0.335" })).toEqual([{ calidad_detalle: 1, cantidad: "0.3350" }]);
});

test("a mano van enteros tal cual; vacío, cero o basura no se mandan; más de lo pendiente se topa", () => {
  const lines = [line(1, "3.00"), line(2, "10.5000"), line(3, "4.00")];
  expect(buildSupplierReturnDetalles(lines, { 1: "2", 2: "10", 3: "", 99: "1" })).toEqual([
    { calidad_detalle: 1, cantidad: "2" },
    { calidad_detalle: 2, cantidad: "10" },
  ]);
  expect(buildSupplierReturnDetalles(lines, { 1: "0", 2: "abc" })).toEqual([]);
  expect(buildSupplierReturnDetalles(lines, { 3: "9" })).toEqual([{ calidad_detalle: 3, cantidad: "4.00" }]);
});

test("al releer se conserva lo capturado, recortado, y solo los renglones nuevos arrancan vacíos", () => {
  const antes = { 1: "2", 2: "10.5000", 3: "3", 4: "1" };
  const releidas = [line(1, "3.00"), line(2, "0.3350"), line(3, "2.5000"), line(5, "1.00")];
  expect(reconcileReturnQuantities(antes, releidas)).toEqual({
    // Cabe: se conserva.
    1: "2",
    // Fraccionario (lo fijó "Todo") por encima del pendiente nuevo: al pendiente exacto.
    2: "0.335",
    // Entero por encima de 2.5: se topa en piezas enteras, como en recepciones.
    3: "2",
    // Renglón nuevo: vacío. El 4 ya no está y se descarta.
    5: "",
  });
});

test("la primera lectura arranca todo vacío", () => {
  expect(reconcileReturnQuantities({}, [line(1, "3.00"), line(2, "0.5000")])).toEqual({ 1: "", 2: "" });
});
