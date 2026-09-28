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
 * Regla de FRONTEND (EC-252): solo el producto terminado (PT) exige talla. El
 * backend acepta `talla: null` para cualquier tipo.
 */
export const productRequiresTalla = (product: Product | undefined): boolean =>
  product?.tipo === PRODUCT_TYPE_IDS.PT;
