import type { DocumentPdfType } from "./documentPdfModel";

/**
 * Nombre del archivo de un documento PDF (EC-855): `<TIPO>-<folio>.pdf`.
 *
 * - El folio es configurable por empresa (`SerieFolio`: prefijo, serie,
 *   separador y sufijo libres), así que se SANEA: todo lo que no sea letra
 *   ASCII, dígito, punto o guion bajo/medio —`/`, espacios, acentos, `:`…—
 *   se vuelve `-`; los guiones repetidos se juntan en uno y se recortan los
 *   guiones y puntos de las orillas.
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
  return safeFolio ? `${type}-${safeFolio}.pdf` : `${type}-ID${id}.pdf`;
}

const sanitizeFileNamePart = (value: string): string =>
  value
    .trim()
    .replace(/[^A-Za-z0-9._-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
