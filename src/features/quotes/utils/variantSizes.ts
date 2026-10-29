/**
 * Tallas de un producto según sus variantes del catálogo del onboarding.
 *
 * Una variante es producto + color + talla. Con `colorId` se toman solo las de
 * ese color; con `null`, las de todos los colores. Sin duplicados y en el orden
 * en que llegan las variantes (el backend las ordena por color y talla). Devuelve
 * los mismos objetos `talla` de las variantes.
 *
 * La comparten el mapeo de partidas de cotización y de pedido (`availableSizes`)
 * y la asignación de color (`getAssignableColors`), para que las tres ofrezcan
 * exactamente las mismas tallas.
 */
export interface VariantSizeSource {
  color: { id: number };
  talla: { id: number; nombre: string };
}

export const getVariantSizes = <T extends VariantSizeSource>(
  variantes: readonly T[],
  colorId: number | null,
): T["talla"][] => {
  const seen = new Set<number>();
  const sizes: T["talla"][] = [];
  for (const variant of variantes) {
    if (colorId !== null && variant.color.id !== colorId) continue;
    if (!seen.has(variant.talla.id)) {
      seen.add(variant.talla.id);
      sizes.push(variant.talla);
    }
  }
  return sizes;
};
