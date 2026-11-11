import type { DocumentPdfType } from "./documentPdfModel";

/**
 * Nombre del archivo de un documento PDF (EC-855): `<TIPO>-<folio>.pdf`.
 *
 * - El folio es configurable por empresa (`SerieFolio`: prefijo, serie,
 *   separador y sufijo libres), así que se SANEA: todo lo que no sea letra
 *   ASCII, dígito, punto o guion bajo/medio —`/`, espacios, acentos, `:`…—
 *   se vuelve `-`; los guiones repetidos se juntan en uno y se recortan los
 *   guiones y puntos de las orillas.
 * - Si el folio YA saneado empieza con `<TIPO>-`, no se repite el código:
 *   `OC` + `OC-00010-2026` → `OC-00010-2026.pdf` (no `OC-OC-…`), mientras
 *   que `OC` + `O-00002` → `OC-O-00002.pdf`. Se compara después de sanear
 *   para que `OC/00010` (→ `OC-00010`) cuente igual. Distingue mayúsculas:
 *   los códigos son fijos en mayúsculas.
 * - Sin folio (nulo, vacío o que no deja nada tras sanearlo) el nombre es
 *   `<TIPO>-ID<id>.pdf`.
 * - Sin sufijo de estatus: que el documento esté cancelado se ve DENTRO del
 *   PDF, no en el nombre.
 */
export function documentPdfFileName(
  type: DocumentPdfType,
  folio: string | null | undefined,
  id: number,
): string {
  const safeFolio = sanitizeFileNamePart(folio ?? "");
  if (!safeFolio) return `${type}-ID${id}.pdf`;
  return safeFolio.startsWith(`${type}-`) ? `${safeFolio}.pdf` : `${type}-${safeFolio}.pdf`;
}

const sanitizeFileNamePart = (value: string): string =>
  value
    .trim()
    .replace(/[^A-Za-z0-9._-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
