/**
 * Línea comercial de una categoría de producto (`CategoriaProducto.linea`).
 * Valores tal cual el `TextChoices` del backend (`CategoriaProducto.Linea`), en
 * su orden: es también el orden de los grupos en los selectores de categoría.
 *
 * La línea solo agrupa categorías: no cambia el SKU, las tallas ni los
 * procesos. "Línea" aquí NO es una línea de pedido.
 */
export const CATEGORIA_LINEAS = [
  "INDUSTRIAL",
  "EMPRESARIAL",
  "ROPA_FRIO",
  "EJECUTIVO",
  "SERVICIOS",
  "EPP",
  "OTROS",
] as const;

export type CategoriaLinea = (typeof CATEGORIA_LINEAS)[number];

/**
 * Valor de `linea` tal como viaja: una de las líneas o `""` (nunca `null`), que
 * es una categoría de materia prima (TELAS, AVIOS).
 */
export type CategoriaLineaValue = CategoriaLinea | "";

/** Etiquetas exactas del backend. Llaves = valores crudos. */
export const CATEGORIA_LINEA_CONFIG: Record<CategoriaLinea, { label: string }> = {
  INDUSTRIAL: { label: "Industrial" },
  EMPRESARIAL: { label: "Empresarial" },
  ROPA_FRIO: { label: "Ropa de frío" },
  EJECUTIVO: { label: "Ejecutivo" },
  SERVICIOS: { label: "Servicios" },
  EPP: { label: "EPP" },
  OTROS: { label: "Otros" },
};

/** Etiqueta de una categoría con `linea` vacía, en toda la app. */
export const SIN_LINEA_LABEL = "Sin línea (materia prima)";

export const isCategoriaLinea = (value: unknown): value is CategoriaLinea =>
  typeof value === "string" && (CATEGORIA_LINEAS as readonly string[]).includes(value);

/**
 * Etiqueta de un valor de `linea`: la del catálogo, `SIN_LINEA_LABEL` si viene
 * vacía y el valor crudo si el backend agrega una línea que el front aún no
 * conoce (así nunca se muestra como materia prima una que no lo es).
 */
export const getCategoriaLineaLabel = (linea: string | null | undefined): string => {
  if (!linea) return SIN_LINEA_LABEL;
  return isCategoriaLinea(linea) ? CATEGORIA_LINEA_CONFIG[linea].label : linea;
};

/**
 * Agrupa categorías por línea para un `<select>` con `<optgroup>`: un grupo por
 * línea del catálogo, en su orden y solo si tiene categorías; luego las líneas
 * desconocidas (si el backend agrega una) y al FINAL las de línea vacía. Dentro
 * de cada grupo se respeta el orden de entrada.
 */
export function groupCategoriesByLinea<T extends { linea: string }>(
  categories: readonly T[],
): { key: string; label: string; categories: T[] }[] {
  const byLinea = new Map<string, T[]>();
  for (const category of categories) {
    const group = byLinea.get(category.linea);
    if (group) group.push(category);
    else byLinea.set(category.linea, [category]);
  }
  const unknown = [...byLinea.keys()].filter((linea) => linea !== "" && !isCategoriaLinea(linea));
  const order = [...CATEGORIA_LINEAS, ...unknown, ""];
  return order.flatMap((linea) => {
    const group = byLinea.get(linea);
    return group ? [{ key: linea || "sin-linea", label: getCategoriaLineaLabel(linea), categories: group }] : [];
  });
}
