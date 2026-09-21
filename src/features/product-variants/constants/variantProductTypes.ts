import type { Product } from "../../products/interfaces/product.interface";

/**
 * Ids de `TipoProducto` (catálogo global). Se declaran todos los del catálogo,
 * no solo los que usa el formulario, para que las reglas se lean contra el
 * enumerado completo.
 */
export const PRODUCT_TYPE_IDS = {
  COMPRAS: 1,
  MP: 2,
  PT: 3,
  SERVICIO: 5,
} as const;

/** Tipos de producto a los que se les pueden crear variantes (EC-249). */
export const VARIANT_PRODUCT_TYPE_IDS: readonly number[] = [
  PRODUCT_TYPE_IDS.COMPRAS,
  PRODUCT_TYPE_IDS.PT,
];

/**
 * Id del tipo del producto, o `null` si no tiene.
 *
 * El backend manda `tipo` como PK entero (FK a `TipoProducto`), pero
 * `Product.tipo` está declarado como `ProductType["codigo"]` (string): es un
 * error de tipado conocido del módulo de productos, fuera de este cambio. Por
 * eso se lee el valor como `unknown` y solo se acepta si realmente es número, en
 * vez de fiarse del tipo declarado.
 */
export const getProductTypeId = (product: Product): number | null => {
  const tipo: unknown = product.tipo;
  return typeof tipo === "number" ? tipo : null;
};

/**
 * Regla de FRONTEND (EC-252): solo el producto terminado (PT) exige talla. El
 * backend acepta `talla: null` para cualquier tipo.
 */
export const productRequiresTalla = (product: Product | undefined): boolean =>
  product !== undefined && getProductTypeId(product) === PRODUCT_TYPE_IDS.PT;
