import { expect, test } from "@playwright/test";
import {
  buildCreateSalidaMaquilaBody,
  draftProblems,
  hasInvalidPrice,
  hasInvalidQty,
  initialDraft,
  lineQty,
  opRenglones,
  opSeed,
  piezasParaLlenar,
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
  test("arranca con las piezas en blanco y el costo de la OP, sin renglones inactivos (EC-922)", () => {
    const d = initialDraft(opRenglones([renglon(1, "2.00"), renglon(2, "5.00", false)]), "35.5000");
    expect(d).toEqual([
      { detalleId: 1, descripcion: "SKU-1 · M · BLANCO", enOrden: 2, cantidad: "", precio: "35.5" },
    ]);
  });

  test("sin costo deja el precio vacío", () => {
    const d = initialDraft(opRenglones([renglon(1, "4.00")]), null);
    expect(d[0].cantidad).toBe("");
    expect(d[0].precio).toBe("");
  });

  test("ningún renglón sale ni cuenta para la salida parcial hasta capturarlo (EC-922)", () => {
    const d = initialDraft(opRenglones([renglon(1, "10.00"), renglon(2, "10.00"), renglon(3, "10.00")]), "5");
    expect(d.reduce((acc, l) => acc + lineQty(l), 0)).toBe(0);
    expect(toDetalles(d, "OP")).toEqual([]);
    expect(draftProblems(d, 30)).toEqual(["sin_piezas"]);
    // Se captura un renglón: solo ese sale y quedan las otras 20 para otra salida.
    const capturado = d.map((l) => (l.detalleId === 1 ? { ...l, cantidad: "10" } : l));
    expect(capturado.reduce((acc, l) => acc + lineQty(l), 0)).toBe(10);
    expect(toDetalles(capturado, "OP")).toEqual([
      { op_detalle: 1, descripcion: "SKU-1 · M · BLANCO", cantidad: "10", precio_unitario: "5" },
    ]);
  });

  test.describe("botón de renglón (EC-922)", () => {
    // OP de 4 renglones de 10 (40 programadas).
    const lines = (cantidades: string[]): SalidaMaquilaDraftLine[] =>
      cantidades.map((cantidad, i) => ({ ...line(cantidad, "5", i + 1), enOrden: 10 }));

    test("sin salidas previas llena el renglón con todas sus piezas, como siempre", () => {
      expect(piezasParaLlenar(lines(["10", "10", "10", ""]), 4, 40, 0)).toBe(10);
      expect(piezasParaLlenar(lines(["", "", "", ""]), 1, 40, 0)).toBe(10);
    });

    test("con salidas previas llena hasta lo que queda libre de la orden", () => {
      // Ya salieron 10: quedan 30.
      expect(piezasParaLlenar(lines(["", "", "", ""]), 1, 30, 10)).toBe(10);
      expect(piezasParaLlenar(lines(["10", "10", "", ""]), 3, 30, 10)).toBe(10);
      expect(piezasParaLlenar(lines(["10", "10", "10", ""]), 4, 30, 10)).toBe(0);
      expect(piezasParaLlenar(lines(["10", "15", "", ""]), 3, 30, 10)).toBe(5);
      // Lo que el propio renglón ya tenía no cuenta como ocupado.
      expect(piezasParaLlenar(lines(["10", "10", "7", ""]), 3, 30, 10)).toBe(10);
    });

    test("nunca negativo, aunque los demás ya rebasen lo que queda", () => {
      expect(piezasParaLlenar(lines(["20", "20", "", ""]), 3, 30, 10)).toBe(0);
    });

    test("llenar los renglones uno por uno nunca rebasa el tope", () => {
      let d = lines(["", "", "", ""]);
      for (const id of [1, 2, 3, 4]) {
        const n = piezasParaLlenar(d, id, 30, 10);
        d = d.map((l) => (l.detalleId === id ? { ...l, cantidad: String(n) } : l));
      }
      expect(d.reduce((acc, l) => acc + lineQty(l), 0)).toBe(30);
      expect(draftProblems(d, 30)).toEqual([]);
    });
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

  test("precios no válidos no se reinterpretan: \"3,50\" no es 350 (EC-911)", () => {
    for (const texto of ["3,50", "$3.50", "3.50.1", "0", "0.00", "1.23456"]) {
      const l = line("2", texto);
      expect(hasInvalidPrice(l)).toBe(true);
      expect(draftProblems([l], 10)).toContain("precio");
    }
    expect(hasInvalidPrice(line("2", " 3.50 "))).toBe(false);
    expect(toDetalles([line("2", " 3.50 ")], "OB")).toEqual([
      { ob_detalle: 1, descripcion: "x", cantidad: "2", precio_unitario: "3.50" },
    ]);
    // Un precio mal escrito bloquea aunque su renglón no lleve piezas.
    expect(draftProblems([line("2", "3.5", 1), line("", "3,5", 2)], 10)).toEqual(["precio"]);
  });

  test("el cuerpo lleva exactamente uno de op, ob u orden_r", () => {
    const rest = { centro_confeccion: 8, detalles: [] };
    expect(buildCreateSalidaMaquilaBody("OP", 82, rest)).toEqual({ op: 82, ...rest });
    expect(buildCreateSalidaMaquilaBody("OB", 7, rest)).toEqual({ ob: 7, ...rest });
    expect(buildCreateSalidaMaquilaBody("OR", 20, rest)).toEqual({ orden_r: 20, ...rest });
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

  test("el borrador de OB/OR arranca sin piezas ni precio: no se puede enviar sin capturarlos", () => {
    const d = initialDraft(servicioSeed("OR", 20, detalles).renglones, null);
    expect(d.map((l) => [l.cantidad, l.precio])).toEqual([
      ["", ""],
      ["", ""],
    ]);
    expect(draftProblems(d, 14)).toEqual(["sin_piezas"]);
    expect(draftProblems([{ ...d[0], cantidad: "10" }, d[1]], 14)).toEqual(["precio"]);
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

test.describe("salida a maquila: renglón de muestra de OB u OR (EC-963)", () => {
  // Detalle de una OR con un renglón de muestra: sin producto y sin la clave
  // `producto_nombre` (DRF la omite), como lo manda el backend tras EC-964.
  const detalles = [
    { id: 41, cantidad: 2, producto: 8562, producto_nombre: "PLAYERA", talla_nombre: "M", color_nombre: "AZUL" },
    { id: 42, cantidad: 1, producto: null, talla_nombre: "28", color_nombre: "AMARILLO NEON" },
  ];

  test("una muestra con SKU se describe como cualquier renglón y manda su descripción", () => {
    const conSku = [{ id: 43, cantidad: 1, producto: null, sku: "MP2177-302-30", talla_nombre: "30", color_nombre: "AMARILLO NEON" }];
    const [renglon] = servicioSeed("OR", 20, conSku).renglones;
    expect(renglon).toEqual({ detalleId: 43, descripcion: "MP2177-302-30 · 30 · AMARILLO NEON", cantidad: 1 });
    const d = initialDraft([renglon], null).map((l) => ({ ...l, cantidad: "1", precio: "2" }));
    expect(toDetalles(d, "OR")).toEqual([
      { or_detalle: 43, descripcion: "MP2177-302-30 · 30 · AMARILLO NEON", cantidad: "1", precio_unitario: "2" },
    ]);
  });

  test("la muestra se rotula «Sin producto de catálogo», nunca vacía ni con un id", () => {
    expect(servicioSeed("OR", 20, detalles).renglones).toEqual([
      { detalleId: 41, descripcion: "PLAYERA · M · AZUL", cantidad: 2 },
      {
        detalleId: 42,
        descripcion: "Sin producto de catálogo · 28 · AMARILLO NEON",
        descripcionDelServidor: true,
        cantidad: 1,
      },
    ]);
  });

  test("el alta omite la descripción de la muestra para que la ponga el backend", () => {
    const d = initialDraft(servicioSeed("OR", 20, detalles).renglones, null).map((l) => ({
      ...l,
      cantidad: "1",
      precio: "2",
    }));
    expect(toDetalles(d, "OR")).toEqual([
      { or_detalle: 41, descripcion: "PLAYERA · M · AZUL", cantidad: "1", precio_unitario: "2" },
      { or_detalle: 42, cantidad: "1", precio_unitario: "2" },
    ]);
  });
});
