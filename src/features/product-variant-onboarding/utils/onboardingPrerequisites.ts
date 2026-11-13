interface OnboardingPrerequisitesInput {
  /**
   * Cuántos productos elegibles hay (conteo de una fila del selector), o
   * `undefined` mientras carga o si falló.
   */
  productTotal: number | undefined;
  /** Colores ya cargados (sin error), o `null` si aún no o si fallaron. */
  colors: readonly unknown[] | null;
}

/**
 * Catálogos que faltan para dar de alta una variante. Un catálogo solo falta
 * cuando su respuesta LLEGÓ y vino vacía: mientras el conteo de productos
 * carga, o si falló, no falta nada y el formulario sigue usable (el selector
 * de producto hace su propia búsqueda y tiene su propio estado vacío).
 */
export function getOnboardingMissingItems({
  productTotal,
  colors,
}: OnboardingPrerequisitesInput): string[] {
  return [
    productTotal === 0 ? "Productos" : null,
    colors !== null && colors.length === 0 ? "Colores" : null,
  ].filter((item): item is string => item !== null);
}
