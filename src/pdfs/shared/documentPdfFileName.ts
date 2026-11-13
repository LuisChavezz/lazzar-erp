import type { DocumentPdfType } from "./documentPdfModel";

/**
 * Nombre del archivo de un documento PDF (EC-855): `<TIPO>-<folio>.pdf`.
 *
 * - El folio es configurable por empresa (`SerieFolio`: prefijo, serie,
 *   separador y sufijo libres), así que se SANEA: todo lo que no sea letra
 *   ASCII, dígito, punto o guion bajo/medio —`/`, espacios, acentos, `:`…—
 *   se vuelve `-`; los guiones repetidos se juntan en uno y se recortan los
 *   guiones y puntos de las orillas.
 * - Si el folio YA saneado trae un SEGMENTO de tipo del documento —un tramo
 *   entre guiones igual a una de sus series (`DOCUMENT_FOLIO_SERIES`, por
 *   defecto el propio código)—, no se repite el código: `OC` +
 *   `OC-00010-2026` → `OC-00010-2026.pdf` y `OP` + `2026-OP-00016` →
 *   `2026-OP-00016.pdf` (EC-857: los folios de producción empiezan con el
 *   año). En cambio `OC` + `O-00002` → `OC-O-00002.pdf` y `OC` + `OCM-15` →
 *   `OC-OCM-15.pdf`: el segmento debe coincidir completo. El folio debe traer
 *   algo además del segmento (`OC` solo no basta). Se compara después de
 *   sanear para que `OC/00010` (→ `OC-00010`) cuente igual. Distingue
 *   mayúsculas: los códigos son fijos en mayúsculas.
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
  const series = DOCUMENT_FOLIO_SERIES[type] ?? [type];
  const segments = safeFolio.split("-");
  const hasTypeSegment = segments.length > 1 && segments.some((segment) => series.includes(segment));
  return hasTypeSegment ? `${safeFolio}.pdf` : `${type}-${safeFolio}.pdf`;
}

/**
 * Segmentos de folio de un tipo cuyo código de archivo no es el único posible.
 * Un tipo ausente solo reconoce su propio código.
 *
 * - Las recepciones (desde OC y desde OP) comparten las series RC, RT y RZ,
 *   fijas en el backend (`_serie_folio_recepcion` y el `serie_codigo` del
 *   onboarding, `compras/api/views.py`): `RT-00011.pdf`, no `RC-RT-00011.pdf`.
 * - La orden de corte de manga se archiva como `OCM`, pero su folio lleva el
 *   segmento `CM` (`2026-CM-00006`, `folio_ocm` del backend): `2026-CM-00006.pdf`.
 */
const DOCUMENT_FOLIO_SERIES: Partial<Record<DocumentPdfType, readonly string[]>> = {
  RC: ["RC", "RT", "RZ"],
  OCM: ["OCM", "CM"],
};

const sanitizeFileNamePart = (value: string): string =>
  value
    .trim()
    .replace(/[^A-Za-z0-9._-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
