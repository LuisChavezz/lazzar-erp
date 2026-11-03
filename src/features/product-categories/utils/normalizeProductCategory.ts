import type { ProductCategory } from "../interfaces/product-category.interface";

/** Categoría tal como puede llegar: un backend sin la migración de `linea` no la manda. */
export type ProductCategoryResponse = Omit<ProductCategory, "linea"> & {
  linea?: ProductCategory["linea"] | null;
};

/**
 * `linea` ausente o `null` → `""` (sin línea): el resto de la app la lee
 * siempre como string, así una categoría sin el campo no forma un grupo aparte
 * en los selectores ni pasa por "sin categoría" en las listas de productos.
 */
export const normalizeProductCategory = (category: ProductCategoryResponse): ProductCategory => ({
  ...category,
  linea: category.linea ?? "",
});
