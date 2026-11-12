/**
 * Fuentes del PDF de un documento (EC-855): de dónde sale el archivo que
 * descarga `useDocumentPdfDownload`. Módulo puro —sin React ni la sesión— para
 * poder probarlo en `tests/unit/`.
 */
import type { DocumentPdfDescriptor, PdfCompany } from "./documentPdfModel";

/** Lo que la descarga le da a la fuente para armar el PDF. */
export interface DocumentPdfContext {
  /** Empresa activa del encabezado, siempre con nombre real (`usePdfCompany`). */
  company: PdfCompany;
}

/**
 * Resultado de una fuente: el PDF listo y la identidad del documento TAL COMO
 * QUEDÓ en ese PDF (folio y cancelación leídos del detalle fresco). El nombre
 * del archivo sale de aquí, no de lo que mostraba la pantalla.
 */
export interface DocumentPdfFile {
  blob: Blob;
  descriptor: DocumentPdfDescriptor;
}

/**
 * De dónde sale el PDF de un documento. Hoy la única forma es construirlo en
 * el cliente desde su detalle (`renderedDocumentPdfSource`); un documento cuyo
 * PDF oficial ya existe en el backend (p. ej. el CFDI en base64) solo necesita
 * otra función con esta firma que decodifique ese archivo.
 */
export type DocumentPdfSource = (context: DocumentPdfContext) => Promise<DocumentPdfFile>;

/**
 * Fuente que construye el PDF en el cliente:
 *
 * 1. `fetchDetail` vuelve a pedir el detalle FRESCO (no una fila o un detalle
 *    cacheados): el estatus real decide la marca de cancelado y la respuesta
 *    ya viene filtrada por el rol, así que el PDF muestra exactamente los
 *    importes que el backend deja ver. Debe llamar al SERVICIO del detalle, no
 *    `queryClient.fetchQuery` sobre la consulta que observa la pantalla: un
 *    fallo escrito en esa consulta dispararía además el aviso de la pantalla
 *    (doble toast) o la cambiaría a su estado de error (EC-856).
 * 2. `describe` lo traduce a la identidad del documento.
 * 3. `render` arma el `Blob` (vía `renderPdfBlob`, con carga diferida).
 */
export function renderedDocumentPdfSource<Detail>({
  fetchDetail,
  describe,
  render,
}: {
  fetchDetail: () => Promise<Detail>;
  describe: (detail: Detail) => DocumentPdfDescriptor;
  render: (detail: Detail, context: DocumentPdfContext & { descriptor: DocumentPdfDescriptor }) => Promise<Blob>;
}): DocumentPdfSource {
  return async (context) => {
    const detail = await fetchDetail();
    const descriptor = describe(detail);
    const blob = await render(detail, { ...context, descriptor });
    return { blob, descriptor };
  };
}
