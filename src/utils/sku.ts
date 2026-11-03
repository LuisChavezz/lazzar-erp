/**
 * Partes de un SKU de producto terminado, leído como en Inditex (Zara):
 * `MMMM` modelo (4 dígitos) + `CCC` color (3 dígitos) + talla (el resto).
 * Ej. "1000503CH" → modelo "1000", color "503", talla "CH".
 */
export interface SkuParts {
  modelo: string;
  color: string;
  talla: string;
}

const SKU_RE = /^(\d{4})(\d{3})([A-Z0-9]+)$/i;

/** `null` si el SKU no sigue el formato modelo + color + talla: se muestra tal cual. */
export const splitSku = (sku: string | null | undefined): SkuParts | null => {
  const match = sku?.trim().match(SKU_RE);
  return match ? { modelo: match[1], color: match[2], talla: match[3].toUpperCase() } : null;
};

/** "1000503CH" → "1000 / 503 / CH"; si no tiene ese formato, el SKU sin cambios. */
export const formatSku = (sku: string | null | undefined): string => {
  const parts = splitSku(sku);
  if (parts) return `${parts.modelo} / ${parts.color} / ${parts.talla}`;
  return sku?.trim() || "";
};

/** Lo que identifica un renglón: el SKU de la variante o, sin variante (materia prima), el código del producto. */
export interface LineCodes {
  producto_variante_sku?: string | null;
  producto_codigo?: string | null;
  producto_cod_proscai?: string | null;
}

/** ¿Algún renglón trae con qué identificarse? Decide si se pinta la columna. */
export const hasLineCode = (lineas: LineCodes[]): boolean =>
  lineas.some(
    (linea) =>
      Boolean(linea.producto_variante_sku?.trim()) ||
      Boolean(linea.producto_codigo?.trim()) ||
      Boolean(linea.producto_cod_proscai?.trim()),
  );
