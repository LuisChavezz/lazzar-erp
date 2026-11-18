import { expect, test } from "@playwright/test";
import {
  draftProblems,
  hasInvalidQty,
  initialDraft,
  lineQty,
  opRenglones,
  opSeed,
  servicioSeed,
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
  detalleId: id,
  descripcion: "x",
  enOrden: 10,
  cantidad,
  precio,
});

test.describe("salida a maquila: borrador", () => {
  test("arranca con las piezas de la OP y su costo, sin renglones inactivos", () => {
    const d = initialDraft(opRenglones([renglon(1, "2.00"), renglon(2, "5.00", false)]), "35.5000", 0);
    expect(d).toEqual([
      { detalleId: 1, descripcion: "SKU-1 · M · BLANCO", enOrden: 2, cantidad: "2", precio: "35.5" },
    ]);
  });

  test("con salidas previas arranca en blanco y sin costo deja el precio vacío", () => {
    const d = initialDraft(opRenglones([renglon(1, "4.00")]), null, 3);
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

  test("piezas no enteras no se reinterpretan: \"2.5\" no es 25 ni 2 (EC-911)", () => {
    for (const texto of ["2.5", "2,5", "25.", "3 pz", "-2"]) {
      const l = line(texto, "10");
      expect(lineQty(l)).toBe(0);
      expect(hasInvalidQty(l)).toBe(true);
      expect(draftProblems([l], 100)).toContain("cantidad");
      expect(toDetalles([l], "OR")).toEqual([]);
    }
    expect(lineQty(line(" 25 ", "10"))).toBe(25);
    expect(hasInvalidQty(line("", "10"))).toBe(false);
  });

  test("solo envía renglones con piezas, con el campo de renglón de la OP", () => {
    expect(toDetalles([line("2", "12.5", 1), line("", "12.5", 2), line("0", "9", 3)], "OP")).toEqual([
      { op_detalle: 1, descripcion: "x", cantidad: "2", precio_unitario: "12.5" },
    ]);
  });
});

test.describe("salida a maquila: OB y OR (EC-911)", () => {
  const detalles = [
    { id: 31, cantidad: 10, sku: "SKU-31", producto_nombre: "PLAYERA", talla_nombre: "CH", color_nombre: "AZUL" },
    { id: 32, cantidad: 4.0, sku: null, producto_nombre: "PLAYERA", talla_nombre: "M", color_nombre: null },
  ];

  test("la semilla de la OP lleva su maquilero y su costo", () => {
    const seed = opSeed({
      op_id: 82,
      folio_op: "OP-1",
      estatus_op: 1,
      centro_confeccion: 8,
      costo_maquila_unitario: "10.0000",
      orden_produccion_detalle: [renglon(1, "5.00")],
    });
    expect(seed).toMatchObject({ origen: "OP", ordenId: 82, centroConfeccion: 8, precioSugerido: "10.0000" });
    expect(seed.renglones).toEqual([{ detalleId: 1, descripcion: "SKU-1 · M · BLANCO", cantidad: 5 }]);
  });

  test("la OB propone su proveedor y ningún precio; la OR, ninguno de los dos", () => {
    const ob = servicioSeed("OB", 7, detalles, 5);
    expect(ob).toMatchObject({ origen: "OB", ordenId: 7, centroConfeccion: 5, precioSugerido: null });
    expect(ob.renglones).toEqual([
      { detalleId: 31, descripcion: "SKU-31 · CH · AZUL", cantidad: 10 },
      { detalleId: 32, descripcion: "PLAYERA · M", cantidad: 4 },
    ]);
    expect(servicioSeed("OR", 20, detalles, 5)).toMatchObject({ centroConfeccion: null, precioSugerido: null });
  });

  test("el borrador de OB/OR arranca sin precio: no se puede enviar sin capturarlo", () => {
    const d = initialDraft(servicioSeed("OR", 20, detalles).renglones, null, 0);
    expect(d.map((l) => [l.cantidad, l.precio])).toEqual([
      ["10", ""],
      ["4", ""],
    ]);
    expect(draftProblems(d, 14)).toEqual(["precio"]);
  });

  test("envía ob_detalle u or_detalle según el origen, siempre con precio", () => {
    const lines = [line("10", "3.50", 31), line("", "3.50", 32)];
    expect(toDetalles(lines, "OB")).toEqual([
      { ob_detalle: 31, descripcion: "x", cantidad: "10", precio_unitario: "3.50" },
    ]);
    expect(toDetalles(lines, "OR")).toEqual([
      { or_detalle: 31, descripcion: "x", cantidad: "10", precio_unitario: "3.50" },
    ]);
  });
});
