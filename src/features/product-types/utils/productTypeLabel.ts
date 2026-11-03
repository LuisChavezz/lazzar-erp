import type { ProductType } from "../interfaces/product-type.interface";

/**
 * Etiqueta visible de un tipo: su `nombre`, o el `codigo` si el nombre viene
 * vacío (el backend lo admite con `default=""`).
 */
export const getProductTypeLabel = (productType: Pick<ProductType, "codigo" | "nombre">): string =>
  productType.nombre.trim() || productType.codigo;

/**
 * Etiqueta del tipo de UN producto (`Product.tipo`, PK nullable) resuelta
 * contra el catálogo de tipos ya cargado, sin pedir nada más.
 *
 * El catálogo solo trae tipos ACTIVOS y `Producto.tipo` es `PROTECT` con baja
 * lógica, así que un id que no aparece con el catálogo ya cargado es un tipo
 * dado de baja: el backend no expone su nombre.
 */
export const getProductTypeLabelById = (
  tipo: ProductType["id"] | null,
  productTypes: readonly ProductType[],
  { isLoading, isError }: { isLoading: boolean; isError: boolean },
): string => {
  if (tipo === null) return "—";
  const productType = productTypes.find((type) => type.id === tipo);
  if (productType) return getProductTypeLabel(productType);
  if (isLoading) return "Cargando...";
  if (isError) return "No se pudo cargar el tipo";
  return "Tipo dado de baja";
};
