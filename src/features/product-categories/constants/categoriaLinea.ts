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

/**
 * `linea` tal como puede llegar del backend: un valor conocido o una línea que
 * el backend agregó y este catálogo aún no conoce (se muestra cruda, nunca se
 * reescribe). `(string & {})` conserva el autocompletado de los conocidos.
 */
export type CategoriaLineaRaw = CategoriaLineaValue | (string & {});

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

/** ¿Es una línea que el backend mandó pero este catálogo no conoce? (`""` sí se conoce.) */
export const isUnrecognizedLinea = (value: string | null | undefined): value is string =>
  typeof value === "string" && value !== "" && !isCategoriaLinea(value);

/** Sufijo de la opción de una línea no reconocida en el formulario. */
export const UNRECOGNIZED_LINEA_SUFFIX = "(no reconocida)";

/**
 * Opciones del select de línea del formulario de categoría: "Sin línea
 * (materia prima)" (`""`) primero, luego el catálogo en su orden y, si la
 * categoría que se edita trae una línea que el catálogo no conoce, esa línea
 * cruda al final, marcada como no reconocida, para que siga visible y
 * seleccionada en vez de que el `<select>` muestre otra opción.
 */
export function getLineaFormOptions(currentLinea?: string | null): { value: string; label: string }[] {
  const options = [
    { value: "", label: SIN_LINEA_LABEL },
    ...CATEGORIA_LINEAS.map((linea) => ({ value: linea as string, label: CATEGORIA_LINEA_CONFIG[linea].label })),
  ];
  if (isUnrecognizedLinea(currentLinea)) {
    options.push({ value: currentLinea, label: `${currentLinea} ${UNRECOGNIZED_LINEA_SUFFIX}` });
  }
  return options;
}

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
