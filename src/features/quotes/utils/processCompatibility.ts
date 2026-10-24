/**
 * Matriz prenda/proceso (EC-563, CO-04 / CO-05; backend EC-575).
 *
 * El onboarding de cotización trae `catalogos.matriz_compatibilidad`, por id de
 * categoría de producto (como string):
 *
 * ```
 * { "210": { "reflejante": ["HOMBROS"] }, "211": { "corte_manga": ["*"] } }
 * ```
 *
 * - Una categoría AUSENTE del bloque no se restringe.
 * - Una categoría presente SIN un proceso no lo admite.
 * - `["*"]` admite el proceso en cualquier ubicación; si no, solo los códigos
 *   listados (en mayúsculas). Corte de manga solo usa `["*"]`.
 *
 * Es un aviso adelantado: el backend aplica la misma regla al guardar y en cada
 * transición, y rechaza con `compatibilidad_proceso`.
 */
import type { QuoteItem } from "../types";

/** Procesos de la matriz, con el nombre del API. */
export type ProcesoMatriz = "bordado" | "reflejante" | "corte_manga";

/** Bloque `catalogos.matriz_compatibilidad` del onboarding de cotización. */
export type MatrizCompatibilidad = Record<string, Partial<Record<ProcesoMatriz, string[]>>>;

/** Matriz vacía: no restringe nada (la referencia es estable entre renders). */
export const EMPTY_MATRIZ: MatrizCompatibilidad = {};

/** Ubicación comodín del bloque: el proceso se admite en cualquiera. */
const CUALQUIER_UBICACION = "*";

/**
 * Lo que admite una categoría (o un conjunto) en un proceso:
 * - `null`: sin restricción, cualquier opción.
 * - un conjunto de códigos: solo esos; vacío = el proceso no se admite.
 */
export type AllowedCodes = ReadonlySet<string> | null;

/** Lo que admite una partida en cada proceso. */
export type ProcessRules = Record<ProcesoMatriz, AllowedCodes>;

/** Reglas sin restricción: una partida sin categoría conocida, o una matriz vacía. */
export const UNRESTRICTED_RULES: ProcessRules = {
  bordado: null,
  reflejante: null,
  corte_manga: null,
};

const normalizeCode = (code: string) => code.trim().toUpperCase();

/** Lo que admite la categoría `categoriaId` en `proceso` según la matriz. */
export const getAllowedCodes = (
  matriz: MatrizCompatibilidad,
  categoriaId: number | null,
  proceso: ProcesoMatriz,
): AllowedCodes => {
  if (categoriaId === null) return null;
  const categoria = matriz[String(categoriaId)];
  if (!categoria) return null;
  const codigos = categoria[proceso];
  if (!codigos) return new Set();
  if (codigos.includes(CUALQUIER_UBICACION)) return null;
  return new Set(codigos.map(normalizeCode));
};

/** Reglas de los tres procesos para una categoría. */
export const getCategoryRules = (
  matriz: MatrizCompatibilidad,
  categoriaId: number | null,
): ProcessRules => ({
  bordado: getAllowedCodes(matriz, categoriaId, "bordado"),
  reflejante: getAllowedCodes(matriz, categoriaId, "reflejante"),
  corte_manga: getAllowedCodes(matriz, categoriaId, "corte_manga"),
});

/** Lo que admiten TODOS los conjuntos (`null` es neutro: no restringe). */
const intersectAllowed = (list: AllowedCodes[]): AllowedCodes =>
  list.reduce<AllowedCodes>((acc, allowed) => {
    if (allowed === null) return acc;
    if (acc === null) return allowed;
    return new Set([...acc].filter((code) => allowed.has(code)));
  }, null);

/**
 * Lo que admiten a la vez todas las categorías (diálogo con varios productos):
 * la intersección por proceso.
 */
export const intersectRules = (rulesList: ProcessRules[]): ProcessRules => ({
  bordado: intersectAllowed(rulesList.map((rules) => rules.bordado)),
  reflejante: intersectAllowed(rulesList.map((rules) => rules.reflejante)),
  corte_manga: intersectAllowed(rulesList.map((rules) => rules.corte_manga)),
});

/** ¿Se admite el proceso en alguna ubicación? */
export const admitsProcess = (allowed: AllowedCodes): boolean =>
  allowed === null || allowed.size > 0;

/** ¿Se admite el proceso en `code`? */
export const admitsCode = (allowed: AllowedCodes, code: string): boolean =>
  allowed === null || allowed.has(normalizeCode(code));

/**
 * De quién se habla en los mensajes: una partida ya agregada, o la selección
 * del diálogo de agregar productos (una prenda o varias a la vez).
 */
export type RestrictionSubject = "partida" | "seleccion-una" | "seleccion-varias";

const PROCESO_LABEL: Record<ProcesoMatriz, string> = {
  bordado: "bordado",
  reflejante: "reflejante",
  corte_manga: "corte de manga",
};

const codeLabel = (proceso: ProcesoMatriz, code: string) =>
  proceso === "bordado" ? `la ubicación ${normalizeCode(code)}` : normalizeCode(code);

/** El proceso no se admite en absoluto (`"Esta prenda no admite reflejante."`). */
export const processNotAdmittedMessage = (
  proceso: ProcesoMatriz,
  subject: RestrictionSubject,
): string => {
  const label = PROCESO_LABEL[proceso];
  if (subject === "partida") return `Esta prenda no admite ${label}.`;
  if (subject === "seleccion-una") return `La prenda seleccionada no admite ${label}.`;
  return proceso === "corte_manga"
    ? "No todas las prendas seleccionadas admiten corte de manga."
    : `Las categorías seleccionadas no comparten ubicaciones de ${label}.`;
};

/** El proceso no se admite en `code` (`"Esta prenda no admite reflejante en RODILLAS."`). */
export const codeNotAdmittedMessage = (
  proceso: ProcesoMatriz,
  code: string,
  subject: RestrictionSubject,
): string => {
  const label = `${PROCESO_LABEL[proceso]} en ${codeLabel(proceso, code)}`;
  if (subject === "partida") return `Esta prenda no admite ${label}.`;
  if (subject === "seleccion-una") return `La prenda seleccionada no admite ${label}.`;
  return `No todas las prendas seleccionadas admiten ${label}.`;
};

/**
 * Regla de ubicaciones que reciben los pasos de bordado y reflejante: qué
 * ofrecer y cómo decir lo que no se admite.
 */
export interface LocationRule {
  allowed: AllowedCodes;
  /** Mensaje cuando el proceso no se admite en ninguna ubicación. */
  notAdmittedMessage: string;
  /** Mensaje para una ubicación concreta que no se admite. */
  codeMessage: (code: string) => string;
}

export const buildLocationRule = (
  proceso: Exclude<ProcesoMatriz, "corte_manga">,
  allowed: AllowedCodes,
  subject: RestrictionSubject,
): LocationRule => ({
  allowed,
  notAdmittedMessage: processNotAdmittedMessage(proceso, subject),
  codeMessage: (code) => codeNotAdmittedMessage(proceso, code, subject),
});

/** Producto del onboarding: solo lo que este módulo lee. */
interface ProductWithCategory {
  id?: number;
  categoria_producto?: number | null;
}

/** `producto.id` → `categoria_producto`, desde `busqueda.productos` del onboarding. */
export const buildProductCategoryMap = (
  products: readonly ProductWithCategory[],
): Map<number, number> => {
  const map = new Map<number, number>();
  for (const product of products) {
    if (product.id && product.categoria_producto) {
      map.set(product.id, product.categoria_producto);
    }
  }
  return map;
};

/**
 * Categoría con la que se evalúa una partida, igual que el backend:
 * - catálogo: la `categoria_producto` de su producto en el onboarding;
 * - muestra de cotización: su propia `categoria_producto`;
 * - muestra de pedido (no guarda categoría): `null`, sin restricción.
 *
 * `null` también si el producto ya no viene en el onboarding: el front no puede
 * saberla y el backend sigue validando.
 */
export const getItemCategoryId = (
  item: Pick<QuoteItem, "tipo" | "productoId"> & { categoria_producto?: number | null },
  productCategoryById: ReadonlyMap<number, number>,
): number | null => {
  if (item.tipo === "muestra") return item.categoria_producto ?? null;
  return item.productoId ? productCategoryById.get(item.productoId) ?? null : null;
};

/** Reglas de una partida. */
export const getItemRules = (
  item: QuoteItem,
  matriz: MatrizCompatibilidad,
  productCategoryById: ReadonlyMap<number, number>,
): ProcessRules => getCategoryRules(matriz, getItemCategoryId(item, productCategoryById));
