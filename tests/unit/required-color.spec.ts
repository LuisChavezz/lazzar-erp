import { expect, test } from "@playwright/test";
import {
  buildProductByIdMap,
  getAssignableColors,
  getMissingColorLines,
  getMissingColorState,
  getServerColorIssues,
  MISSING_COLOR_MESSAGE,
  UNKNOWN_COLOR_AFTER_400_MESSAGE,
} from "@/src/features/quotes/utils/requiredColor";
import { getVariantSizes } from "@/src/features/quotes/utils/variantSizes";
import { extractQuoteValidationIssues } from "@/src/features/quotes/utils/quoteValidationErrors";

/**
 * Pruebas unitarias de EC-641: qué partidas exigen color (misma regla que
 * `exigir_color_si_hay_variantes` del backend) y qué colores se les ofrecen.
 */
const gris = { id: 1, nombre: "Gris", codigo: "GRI", codigo_hex: "#888888" };
const azul = { id: 2, nombre: "Azul", codigo: "AZU", codigo_hex: "#0000ff" };
const ch = { id: 10, nombre: "CH" };
const m = { id: 11, nombre: "M" };
const g = { id: 12, nombre: "G" };

const products = buildProductByIdMap([
  {
    id: 100,
    variantes: [
      { color: gris, talla: ch },
      { color: gris, talla: m },
      { color: azul, talla: ch },
    ],
  },
]);

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

  test("un producto fuera del catálogo es desconocido, no un error", () => {
    expect(getMissingColorState({ tipo: "catalogo", productoId: 999 }, products)).toBe("unknown");
  });

  test("un catálogo vacío (o que no cargó) no exige color a nadie", () => {
    expect(
      getMissingColorLines(
        [{ tipo: "catalogo", productoId: 100, colorId: null }],
        buildProductByIdMap([]),
      ),
    ).toEqual([{ index: 0, state: "unknown" }]);
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

test.describe("getServerColorIssues (tras un 400 `color` real)", () => {
  test("la partida desconocida recibe el aviso de que no se puede arreglar aquí", () => {
    expect(
      getServerColorIssues(
        [
          { tipo: "catalogo", productoId: 100, colorId: null },
          { tipo: "catalogo", productoId: 999, colorId: null },
          { tipo: "catalogo", productoId: 999, colorId: 1 },
        ],
        products,
      ),
    ).toEqual([
      { path: "items.0.colorId", message: MISSING_COLOR_MESSAGE },
      { path: "items.1.colorId", message: UNKNOWN_COLOR_AFTER_400_MESSAGE },
    ]);
  });

  test("el aviso dice que puede requerir color y qué hacer", () => {
    expect(UNKNOWN_COLOR_AFTER_400_MESSAGE).toBe(
      "Puede requerir un color que no se puede asignar aquí: el producto no tiene variantes activas en el catálogo. Activa una variante del producto en Catálogo y vuelve a intentar.",
    );
  });
});

test.describe("getVariantSizes", () => {
  const variantes = [
    { color: gris, talla: ch },
    { color: gris, talla: m },
    { color: azul, talla: ch },
    { color: gris, talla: m },
  ];

  test("con color: solo sus tallas, sin duplicados y en el orden de las variantes", () => {
    expect(getVariantSizes(variantes, gris.id)).toEqual([ch, m]);
  });

  test("sin color: las tallas de todos los colores", () => {
    expect(getVariantSizes(variantes, null)).toEqual([ch, m]);
  });

  test("un color sin variantes no tiene tallas", () => {
    expect(getVariantSizes(variantes, 99)).toEqual([]);
  });
});

test.describe("extractQuoteValidationIssues con `color`", () => {
  test("acepta la lista que manda DRF y el string suelto, con la ruta `color`", () => {
    const message = "Elige el color de: Playera.";
    expect(extractQuoteValidationIssues({ color: [message] })).toEqual([
      { path: "color", message },
    ]);
    expect(extractQuoteValidationIssues({ color: message })).toEqual([
      { path: "color", message },
    ]);
  });
});

test.describe("extractQuoteValidationIssues con strings de primer nivel", () => {
  test("un error de campo como string suelto llega con su ruta del formulario", () => {
    expect(extractQuoteValidationIssues({ cliente_rfc: "RFC inválido." })).toEqual([
      { path: "rfc", message: "RFC inválido." },
    ]);
  });

  test("las claves de rechazo como string no se vuelven errores de campo", () => {
    expect(
      extractQuoteValidationIssues({
        detail: "x",
        non_field_errors: "x",
        detalle: "Partida 1: tope",
        permiso: "x",
        cotizacion: "x",
        pedido: "x",
        compatibilidad_proceso: "x",
      }),
    ).toEqual([]);
  });

  test("`pedido` y `detalle` anidados se siguen recorriendo", () => {
    expect(
      extractQuoteValidationIssues({
        pedido: { persona_pagos: ["Requerido"] },
        detalle: [{ precio_unitario: ["Debe ser positivo"] }],
      }),
    ).toEqual([
      { path: "persona_pagos", message: "Requerido" },
      { path: "items.0.precio", message: "Debe ser positivo" },
    ]);
  });
});
