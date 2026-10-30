/**
 * Texto visible de un código de catálogo (tipo, estado, gravedad…): su
 * etiqueta, o el código CRUDO si el catálogo del front no lo conoce, o "—" sin
 * valor. Es la regla que comparten la celda, la búsqueda global, el orden y la
 * opción del filtro de encabezado (que rotula los códigos desconocidos con el
 * mismo código crudo), así que un solo lugar la define.
 *
 * `label` es lo que devolvió el catálogo para `code` (`null` si no lo conoce).
 */
export const catalogText = (
  label: string | null | undefined,
  code: string | null | undefined,
): string => label ?? (code || "—");
