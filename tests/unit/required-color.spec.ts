import { expect, test } from "@playwright/test";
import {
  getAssignableColors,
  getMissingColorLines,
  getMissingColorState,
} from "@/src/features/quotes/utils/requiredColor";

/**
 * Pruebas unitarias de EC-641: qué partidas exigen color (misma regla que
 * `exigir_color_si_hay_variantes` del backend) y qué colores se les ofrecen.
 */
const gris = { id: 1, nombre: "Gris", codigo: "GRI", codigo_hex: "#888888" };
const azul = { id: 2, nombre: "Azul", codigo: "AZU", codigo_hex: "#0000ff" };
const ch = { id: 10, nombre: "CH" };
const m = { id: 11, nombre: "M" };
const g = { id: 12, nombre: "G" };

const products = [
  {
    id: 100,
    variantes: [
      { sku: "A", color: gris, talla: ch },
      { sku: "B", color: gris, talla: m },
      { sku: "C", color: azul, talla: ch },
    ],
  },
];

test.describe("getMissingColorLines", () => {
  test("marca la partida de catálogo sin color cuyo producto tiene variantes", () => {
    expect(
      getMissingColorLines([{ tipo: "catalogo", productoId: 100, colorId: undefined }], products),
    ).toEqual([{ index: 0, state: "assignable" }]);
  });

  test("ignora las partidas con color, las muestras y las que no tienen producto", () => {
    expect(
      getMissingColorLines(
        [
          { tipo: "catalogo", productoId: 100, colorId: 1 },
          { tipo: "muestra", productoId: null, colorId: undefined },
          { tipo: "catalogo", productoId: 0, colorId: undefined },
        ],
        products,
      ),
    ).toEqual([]);
  });

  test("un producto fuera del catálogo queda como no asignable", () => {
    expect(getMissingColorState({ tipo: "catalogo", productoId: 999 }, products)).toBe(
      "unavailable",
    );
  });

  test("conserva el índice de cada partida", () => {
    expect(
      getMissingColorLines(
        [
          { tipo: "catalogo", productoId: 100, colorId: 2 },
          { tipo: "catalogo", productoId: 100, colorId: null },
        ],
        products,
      ),
    ).toEqual([{ index: 1, state: "assignable" }]);
  });
});

test.describe("getAssignableColors", () => {
  test("un color que no cubre las tallas capturadas lista las que le faltan", () => {
    const choices = getAssignableColors(
      {
        tipo: "catalogo",
        productoId: 100,
        tallas: [
          { tallaId: 10, nombre: "CH" },
          { tallaId: 11, nombre: "M" },
        ],
      },
      products,
    );
    expect(choices.map((choice) => [choice.color.nombre, choice.missingSizes])).toEqual([
      ["Gris", []],
      ["Azul", ["M"]],
    ]);
    expect(choices[0].sizes).toEqual([ch, m]);
  });

  test("una talla que ningún color tiene deja todos los colores bloqueados", () => {
    const choices = getAssignableColors(
      { tipo: "catalogo", productoId: 100, tallas: [{ tallaId: 12, nombre: g.nombre }] },
      products,
    );
    expect(choices.every((choice) => choice.missingSizes.length > 0)).toBe(true);
  });
});
