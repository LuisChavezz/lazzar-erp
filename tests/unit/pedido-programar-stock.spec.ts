import { expect, test } from "@playwright/test";
import type { PedidoProgramarRenglon } from "@/src/features/orders/interfaces/pedido-programacion.interface";
import {
  getProgramarStockResumen,
  getProgramarTallasExcluidas,
  getTallaCoverage,
  getTallaDiferencia,
  groupRenglonesPorPartida,
  tieneStock,
} from "@/src/features/orders/utils/pedidoProgramarStock";

/**
 * Pruebas unitarias de EC-629/EC-631: cobertura de existencia de "Programar
 * pedido" por talla y por partida, calculada solo con
 * `GET /ventas/pedidos/{id}/programar/`.
 */
let nextId = 1;
const renglon = (overrides: Partial<PedidoProgramarRenglon>): PedidoProgramarRenglon => ({
  pedido_detalle_talla_id: nextId++,
  pedido_detalle_id: 1,
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

const conStock = (cantidad: number, stock: number, partida = 1) =>
  renglon({
    pedido_detalle_id: partida,
    cantidad,
    stock_disponible: stock,
    faltante: Math.max(cantidad - stock, 0),
  });
const muestra = (cantidad: number, partida = 1) =>
  renglon({
    pedido_detalle_id: partida,
    es_muestra: true,
    sku: null,
    variante_id: null,
    cantidad,
    stock_disponible: null,
    faltante: null,
  });
const sinMedir = (cantidad: number, partida = 1) =>
  renglon({
    pedido_detalle_id: partida,
    sku: null,
    variante_id: null,
    cantidad,
    stock_disponible: null,
    faltante: null,
  });

const resumenDe = (renglones: PedidoProgramarRenglon[]) =>
  getProgramarStockResumen(groupRenglonesPorPartida(renglones));

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

test.describe("groupRenglonesPorPartida", () => {
  test("agrupa por pedido_detalle_id respetando el orden del GET", () => {
    const a1 = conStock(1, 5, 20);
    const b1 = conStock(1, 5, 10);
    const a2 = conStock(1, 5, 20);
    const partidas = groupRenglonesPorPartida([a1, b1, a2]);
    expect(partidas.map((partida) => partida.id)).toEqual([20, 10]);
    expect(partidas[0].renglones).toEqual([a1, a2]);
  });

  test("toma producto y color de la primera talla", () => {
    const [partida] = groupRenglonesPorPartida([
      renglon({ producto: "FILIPINA", color: null }),
      renglon({ producto: "OTRO", color: "ROJO" }),
    ]);
    expect(partida.producto).toBe("FILIPINA");
    expect(partida.color).toBeNull();
  });

  test("toma categoría y nombre corto de la primera talla; vacíos o ausentes quedan null", () => {
    const [conDatos, sinDatos] = groupRenglonesPorPartida([
      renglon({ categoria_nombre: "Chamarra", producto_nombre_corto: "TRIPLE FORRO SCT" }),
      renglon({ pedido_detalle_id: 99, categoria_nombre: "  ", producto_nombre_corto: undefined }),
    ]);
    expect(conDatos.categoria).toBe("Chamarra");
    expect(conDatos.productoCorto).toBe("TRIPLE FORRO SCT");
    expect(sinDatos.categoria).toBeNull();
    expect(sinDatos.productoCorto).toBeNull();
  });

  test("estado: cubierta, parcial y sin existencia", () => {
    const [cubierta, parcial, mixta, sinExistencia] = groupRenglonesPorPartida([
      conStock(2, 2, 1),
      conStock(3, 5, 1),
      conStock(5, 2, 2),
      conStock(5, 2, 3),
      conStock(5, 5, 3),
      conStock(4, 0, 4),
      conStock(1, 0, 4),
    ]);
    expect(cubierta.coverage).toBe("full");
    expect(parcial.coverage).toBe("partial");
    expect(mixta.coverage).toBe("partial");
    expect(sinExistencia.coverage).toBe("none");
  });

  test("una talla sin stock deja la partida 'Sin medir' aunque las demás estén cubiertas", () => {
    const [partida] = groupRenglonesPorPartida([conStock(2, 10), sinMedir(1), conStock(3, 0)]);
    expect(partida.coverage).toBe("unmeasured");
    // Faltan solo de las tallas medidas.
    expect(partida.faltan).toBe(3);
  });

  test("Faltan N suma el faltante del backend de sus tallas", () => {
    const [partida] = groupRenglonesPorPartida([conStock(10, 15), conStock(10, 5), conStock(10, 0)]);
    expect(partida.faltan).toBe(15);
  });

  test("las partidas de muestra no tienen estado ni faltantes", () => {
    const [partida] = groupRenglonesPorPartida([muestra(4), muestra(2)]);
    expect(partida.esMuestra).toBe(true);
    expect(partida.coverage).toBeNull();
    expect(partida.faltan).toBe(0);
  });
});

test.describe("getProgramarStockResumen", () => {
  test("null sin partidas o con solo partidas de muestra", () => {
    expect(resumenDe([])).toBeNull();
    expect(resumenDe([muestra(3, 1), muestra(2, 2)])).toBeNull();
  });

  test("el % se redondea hacia abajo y se mide por piezas", () => {
    // Cubiertas: 2 + 4 + 0 = 6 de 17 → 35.29 % → 35.
    const resumen = resumenDe([conStock(2, 1942, 1), conStock(10, 4, 2), conStock(5, 0, 3)]);
    expect(resumen?.percent).toBe(35);
    expect(resumen?.partidasCubiertas).toBe(1);
    expect(resumen?.partidasTotal).toBe(3);
    expect(resumen?.piezasFaltantes).toBe(11);
    expect(resumen?.pedidoCubierto).toBe(false);
  });

  test("nunca muestra 100 % con faltantes", () => {
    // 399 de 400 → 99.75 % → 99.
    const resumen = resumenDe([conStock(399, 399, 1), conStock(1, 0, 2)]);
    expect(resumen?.percent).toBe(99);
    expect(resumen?.pedidoCubierto).toBe(false);
  });

  test("cuenta partidas, no tallas", () => {
    // Partida 1 cubierta (2 tallas), partida 2 parcial (una talla falta).
    const resumen = resumenDe([
      conStock(1, 5, 1),
      conStock(1, 5, 1),
      conStock(1, 5, 2),
      conStock(4, 1, 2),
    ]);
    expect(resumen?.partidasCubiertas).toBe(1);
    expect(resumen?.partidasTotal).toBe(2);
  });

  test("el reparto del backend (pool 15, tres tallas de 10) da una partida parcial", () => {
    // EC-644: CH 15/0, M 5/5, G 0/10.
    const resumen = resumenDe([conStock(10, 15), conStock(10, 5), conStock(10, 0)]);
    expect(resumen?.partidasCubiertas).toBe(0);
    expect(resumen?.partidasTotal).toBe(1);
    expect(resumen?.piezasFaltantes).toBe(15);
    expect(resumen?.percent).toBe(50);
  });

  test("las partidas de muestra quedan fuera del total y no impiden el pedido cubierto", () => {
    const resumen = resumenDe([conStock(2, 10, 1), muestra(4, 2)]);
    expect(resumen?.percent).toBe(100);
    expect(resumen?.partidasCubiertas).toBe(1);
    expect(resumen?.partidasTotal).toBe(1);
    expect(resumen?.pedidoCubierto).toBe(true);
  });

  test("una partida 'Sin medir' cuenta en el total pero nunca como cubierta", () => {
    const resumen = resumenDe([conStock(2, 10, 1), sinMedir(3, 2)]);
    expect(resumen?.partidasCubiertas).toBe(1);
    expect(resumen?.partidasTotal).toBe(2);
    expect(resumen?.percent).toBe(100);
    expect(resumen?.pedidoCubierto).toBe(false);
  });

  test("sin ninguna talla medida no hay %, pero sí partidas", () => {
    const resumen = resumenDe([sinMedir(1, 1), sinMedir(1, 1), muestra(2, 2)]);
    expect(resumen?.percent).toBeNull();
    expect(resumen?.partidasCubiertas).toBe(0);
    expect(resumen?.partidasTotal).toBe(1);
    expect(resumen?.piezasFaltantes).toBe(0);
    expect(resumen?.pedidoCubierto).toBe(false);
  });
});

test("getProgramarTallasExcluidas cuenta tallas de muestra y sin medir", () => {
  expect(
    getProgramarTallasExcluidas([conStock(1, 1), muestra(2), muestra(1), sinMedir(1)]),
  ).toEqual({ muestra: 2, sinMedir: 1 });
  expect(getProgramarTallasExcluidas([conStock(1, 1)])).toEqual({ muestra: 0, sinMedir: 0 });
});
