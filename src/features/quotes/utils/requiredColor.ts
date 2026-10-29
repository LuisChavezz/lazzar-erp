/**
 * Color obligatorio en partidas de catálogo cuyo producto tiene variantes (EC-641).
 *
 * El backend (`exigir_color_si_hay_variantes`, nucleo-erp #731) rechaza con
 * `400 {"color": "Elige el color de: A, B."}` enviar a revisión, autorizar,
 * aceptar cambios y editar en mesa de control cuando una línea con `producto`,
 * sin `color` y que no es muestra apunta a un producto con al menos una
 * variante (activa o no). El mensaje solo trae NOMBRES de producto, sin índice
 * de partida, así que las partidas culpables se calculan aquí con la misma
 * regla, nunca leyendo los nombres del mensaje.
 *
 * Limitación de los datos: el catálogo del onboarding (`busqueda.productos`)
 * solo trae productos con variantes ACTIVAS y solo esas variantes. Un producto
 * que no aparece ahí puede no tener variantes (el backend lo acepta sin color)
 * o tenerlas todas inactivas (el backend exige un color que no se puede
 * ofrecer). Por eso hay dos estados:
 *
 * - `assignable`: el producto está en el catálogo, así que tiene variantes y el
 *   color se puede elegir entre ellas.
 * - `unavailable`: el producto no está en el catálogo; no hay colores que
 *   ofrecer y no se sabe si el backend lo exigirá.
 */
import type { Color } from "../../colors/interfaces/color.interface";

interface VariantLike {
  color: Color;
  talla: { id: number; nombre: string };
}

export interface RequiredColorProduct {
  id?: number;
  variantes?: readonly VariantLike[];
}

export interface RequiredColorItem {
  tipo?: "catalogo" | "muestra";
  productoId?: number | null;
  colorId?: number | null;
  tallas?: readonly { tallaId: number; nombre: string }[];
}

export type MissingColorState = "assignable" | "unavailable";

export interface MissingColorLine {
  index: number;
  state: MissingColorState;
}

/** Mensaje de la partida que puede recibir un color del catálogo. */
export const MISSING_COLOR_MESSAGE = "Elige un color para esta partida";

/** Mensaje de la partida cuyo producto no ofrece colores en el catálogo. */
export const UNAVAILABLE_COLOR_MESSAGE =
  "Sin color y sin colores disponibles: el producto no tiene variantes activas en el catálogo";

const findProduct = (
  products: readonly RequiredColorProduct[],
  productoId: number,
): RequiredColorProduct | undefined => products.find((product) => product.id === productoId);

/**
 * Partidas de catálogo sin color. Una muestra (`tipo: "muestra"`) nunca cuenta:
 * es el `producto_nombre_externo` no vacío que el backend también excluye.
 */
export const getMissingColorLines = (
  items: readonly RequiredColorItem[],
  products: readonly RequiredColorProduct[],
): MissingColorLine[] =>
  items.flatMap((item, index) => {
    if (item.tipo === "muestra") return [];
    if (!item.productoId || item.productoId < 1) return [];
    if (item.colorId && item.colorId > 0) return [];
    const product = findProduct(products, item.productoId);
    const state: MissingColorState = product?.variantes?.length ? "assignable" : "unavailable";
    return [{ index, state }];
  });

/** Estado de UNA partida, o `null` si no le falta color. */
export const getMissingColorState = (
  item: RequiredColorItem | undefined,
  products: readonly RequiredColorProduct[],
): MissingColorState | null =>
  item ? (getMissingColorLines([item], products)[0]?.state ?? null) : null;

export interface ColorChoice {
  color: Color;
  /** Tallas de la variante con ese color, en el orden del catálogo. */
  sizes: { id: number; nombre: string }[];
  /** Tallas que ya lleva la partida y este color no tiene. Vacío ⇒ elegible. */
  missingSizes: string[];
}

/**
 * Colores que se pueden asignar a una partida sin color.
 *
 * Una variante es producto + color + talla, y el backend resuelve la variante
 * de cada talla de la línea con el color elegido. Un color que no cubre todas
 * las tallas ya capturadas dejaría esas tallas sin variante (sin SKU ni stock),
 * justo lo que #731 quiere evitar. Esos colores se devuelven con
 * `missingSizes` para mostrarlos deshabilitados con el motivo, en vez de
 * descartar tallas en silencio.
 */
export const getAssignableColors = (
  item: RequiredColorItem,
  products: readonly RequiredColorProduct[],
): ColorChoice[] => {
  if (!item.productoId) return [];
  const product = findProduct(products, item.productoId);
  const byColor = new Map<number, ColorChoice>();
  for (const variant of product?.variantes ?? []) {
    const choice = byColor.get(variant.color.id) ?? {
      color: variant.color,
      sizes: [],
      missingSizes: [],
    };
    if (!choice.sizes.some((size) => size.id === variant.talla.id)) {
      choice.sizes.push({ id: variant.talla.id, nombre: variant.talla.nombre });
    }
    byColor.set(variant.color.id, choice);
  }
  const lineSizes = item.tallas ?? [];
  return [...byColor.values()].map((choice) => {
    const available = new Set(choice.sizes.map((size) => size.id));
    const missing = lineSizes
      .filter((size) => !available.has(size.tallaId))
      .map((size) => size.nombre);
    return { ...choice, missingSizes: [...new Set(missing)] };
  });
};
