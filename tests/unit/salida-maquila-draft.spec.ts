import { expect, test } from "@playwright/test";
import {
  draftProblems,
  initialDraft,
  toDetalles,
  type SalidaMaquilaDraftLine,
} from "../../src/features/maquila-outputs/utils/salidaMaquilaDraft";

const renglon = (id: number, cantidad: string, activo = true) => ({
  op_detalle_id: id,
  cantidad,
  activo,
  producto_variante: { sku: `SKU-${id}`, producto_nombre: "BATA", talla_nombre: "M", color_nombre: "BLANCO" },
});

const line = (cantidad: string, precio: string, id = 1): SalidaMaquilaDraftLine => ({
  opDetalle: id,
  descripcion: "x",
  enOp: 10,
  cantidad,
  precio,
});

test.describe("salida a maquila: borrador", () => {
  test("arranca con las piezas de la OP y su costo, sin renglones inactivos", () => {
    const d = initialDraft([renglon(1, "2.00"), renglon(2, "5.00", false)], "35.5000", 0);
    expect(d).toEqual([
      { opDetalle: 1, descripcion: "SKU-1 · M · BLANCO", enOp: 2, cantidad: "2", precio: "35.5" },
    ]);
  });

  test("con salidas previas arranca en blanco y sin costo deja el precio vacío", () => {
    const d = initialDraft([renglon(1, "4.00")], null, 3);
    expect(d[0].cantidad).toBe("");
    expect(d[0].precio).toBe("");
  });

  test("detecta sin piezas, exceso, piezas no enteras y precio faltante", () => {
    expect(draftProblems([line("", "10")], 10)).toEqual(["sin_piezas"]);
    expect(draftProblems([line("11", "10")], 10)).toEqual(["excede"]);
    expect(draftProblems([line("1.5", "10")], 10)).toContain("cantidad");
    expect(draftProblems([line("2", "0")], 10)).toEqual(["precio"]);
    expect(draftProblems([line("2", "12.5")], 10)).toEqual([]);
  });

  test("solo envía renglones con piezas", () => {
    expect(toDetalles([line("2", "12.5", 1), line("", "12.5", 2), line("0", "9", 3)])).toEqual([
      { op_detalle: 1, descripcion: "x", cantidad: "2", precio_unitario: "12.5" },
    ]);
  });
});
