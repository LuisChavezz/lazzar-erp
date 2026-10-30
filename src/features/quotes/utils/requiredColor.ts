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
 * solo trae productos ACTIVOS con al menos una variante ACTIVA, y solo esas
 * variantes. Un producto sin variantes, uno con todas sus variantes inactivas y
 * uno inactivo quedan igual de AUSENTES, y un catálogo que no cargó llega vacío.
 * Así que de una partida sin color solo se sabe algo cuando su producto ESTÁ en
 * el catálogo:
 *
 * - `assignable`: el producto tiene variantes; el color es obligatorio y se
 *   puede elegir entre ellas.
 * - `unknown`: el producto no está en el catálogo. Puede no tener variantes (y
 *   el backend la acepta sin color): no se marca ni se bloquea por eso. Solo un
 *   400 real del backend la señala.
 */
import type { Color } from "../../colors/interfaces/color.interface";
import { getVariantSizes } from "./variantSizes";

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

export type MissingColorState = "assignable" | "unknown";

/** Catálogo indexado por id, para no recorrerlo por cada partida. */
export type RequiredColorProductsById = ReadonlyMap<number, RequiredColorProduct>;

export const buildProductByIdMap = (
  products: readonly RequiredColorProduct[],
): RequiredColorProductsById => {
  const map = new Map<number, RequiredColorProduct>();
  for (const product of products) {
    if (product.id != null) map.set(product.id, product);
  }
  return map;
};

export interface MissingColorLine {
  index: number;
  state: MissingColorState;
}

/** Mensaje de la partida que puede recibir un color del catálogo. */
export const MISSING_COLOR_MESSAGE = "Elige un color para esta partida";

/**
 * Mensaje de una partida `unknown` tras un 400 `color` REAL. "Puede" a
 * propósito: el backend cuenta también variantes INACTIVAS, que el catálogo no
 * trae, así que no se sabe si esta partida es de las que falló (su producto
 * podría no tener variantes). Se arregla fuera de esta pantalla.
 */
export const UNKNOWN_COLOR_AFTER_400_MESSAGE =
  "Puede requerir un color que no se puede asignar aquí: el producto no tiene variantes activas en el catálogo. Activa una variante del producto en Catálogo y vuelve a intentar.";

/**
 * Partidas de catálogo sin color. Una muestra (`tipo: "muestra"`) nunca cuenta:
 * es el `producto_nombre_externo` no vacío que el backend también excluye.
 */
export const getMissingColorLines = (
  items: readonly RequiredColorItem[],
  productsById: RequiredColorProductsById,
): MissingColorLine[] =>
  items.flatMap((item, index) => {
    if (item.tipo === "muestra") return [];
    if (!item.productoId || item.productoId < 1) return [];
    if (item.colorId && item.colorId > 0) return [];
    const state: MissingColorState = productsById.get(item.productoId)?.variantes?.length
      ? "assignable"
      : "unknown";
    return [{ index, state }];
  });

/** Estado de UNA partida, o `null` si no le falta color. */
export const getMissingColorState = (
  item: RequiredColorItem | undefined,
  productsById: RequiredColorProductsById,
): MissingColorState | null =>
  item ? (getMissingColorLines([item], productsById)[0]?.state ?? null) : null;

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
  productsById: RequiredColorProductsById,
): ColorChoice[] => {
  if (!item.productoId) return [];
  const variantes = productsById.get(item.productoId)?.variantes ?? [];
  const colors = new Map<number, Color>();
  for (const variant of variantes) {
    if (!colors.has(variant.color.id)) colors.set(variant.color.id, variant.color);
  }
  const lineSizes = item.tallas ?? [];
  return [...colors.values()].map((color) => {
    const sizes = getVariantSizes(variantes, color.id);
    const available = new Set(sizes.map((size) => size.id));
    const missing = lineSizes
      .filter((size) => !available.has(size.tallaId))
      .map((size) => size.nombre);
    return { color, sizes, missingSizes: [...new Set(missing)] };
  });
};

/**
 * Errores por partida para un 400 `color` real: las que se pueden arreglar con
 * "Asignar color" y, con el aviso de arriba, las `unknown`. Nunca lee los
 * nombres de producto del mensaje.
 */
export const getServerColorIssues = (
  items: readonly RequiredColorItem[],
  productsById: RequiredColorProductsById,
): { path: string; message: string }[] =>
  getMissingColorLines(items, productsById).map((line) => ({
    path: `items.${line.index}.colorId`,
    message:
      line.state === "assignable" ? MISSING_COLOR_MESSAGE : UNKNOWN_COLOR_AFTER_400_MESSAGE,
  }));
