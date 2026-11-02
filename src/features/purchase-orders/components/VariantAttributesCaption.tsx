import { variantAttributesLabel } from "../utils/purchaseOrderLines";

interface VariantAttributesCaptionProps {
  color: string | null | undefined;
  talla: string | null | undefined;
}

/**
 * Línea secundaria "Color · Talla" bajo el nombre del producto de un renglón
 * de OC (EC-684): distingue dos tallas del mismo producto. No pinta nada si el
 * renglón no tiene variante (materia prima, PT sin SKU).
 */
export function VariantAttributesCaption({ color, talla }: VariantAttributesCaptionProps) {
  const label = variantAttributesLabel(color, talla);
  if (!label) return null;
  return (
    <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">{label}</span>
  );
}
