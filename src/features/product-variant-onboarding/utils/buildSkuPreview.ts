interface SkuPreviewParts {
  /** `Producto.codigo`; puede faltar en productos antiguos. */
  productCode: string | null | undefined;
  colorCode: string | undefined;
  /** Nombre de la talla; `undefined` cuando la variante no lleva talla. */
  tallaName: string | undefined;
}

/**
 * SKU ESTIMADO, solo informativo: replica la regla del backend
 * (`CODIGO-COLOR[-TALLA]`, en mayúsculas) para que el usuario vea qué se va a
 * generar. El SKU real lo devuelve el servidor en el 201.
 *
 * Devuelve `null` mientras falte alguna pieza, o si el producto no tiene código
 * (el backend rechazará ese alta con su propio 400).
 */
export const buildSkuPreview = ({
  productCode,
  colorCode,
  tallaName,
}: SkuPreviewParts): string | null => {
  if (!productCode || !colorCode) return null;
  const parts = [productCode, colorCode, ...(tallaName ? [tallaName] : [])];
  return parts.join("-").trim().toUpperCase();
};
