"use client";

import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useSessionCompanyDetails } from "@/src/features/workspace/hooks/useSessionCompanyDetails";
import { documentPdfFileName } from "@/src/pdfs/shared/documentPdfFileName";
import type { DocumentPdfDescriptor, PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { downloadBlob } from "@/src/utils/downloadBlob";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";

/** Lo que la descarga le da a la fuente para armar el PDF. */
export interface DocumentPdfContext {
  /** Empresa activa para el encabezado; `null` si la sesión no tiene una. */
  company: PdfCompany | null;
}

/**
 * Resultado de una fuente: el PDF listo y la identidad del documento TAL COMO
 * QUEDÓ en ese PDF (folio y cancelación leídos del detalle fresco). El nombre
 * del archivo sale de aquí, no de lo que mostraba la pantalla.
 */
export interface DocumentPdfFile {
  blob: Blob;
  document: DocumentPdfDescriptor;
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
 *    importes que el backend deja ver.
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
  render: (detail: Detail, context: DocumentPdfContext & { document: DocumentPdfDescriptor }) => Promise<Blob>;
}): DocumentPdfSource {
  return async (context) => {
    const detail = await fetchDetail();
    const document = describe(detail);
    const blob = await render(detail, { ...context, document });
    return { blob, document };
  };
}

/**
 * "Descargar PDF" de un documento (EC-855): obtiene el PDF de su fuente, lo
 * descarga como `<TIPO>-<folio>.pdf` y avisa con un toast.
 *
 * Espera a que se conozca la empresa activa (`companyPending`) para no generar
 * un documento sin encabezado mientras `mis-empresas/` todavía responde. Sin
 * empresa en la sesión (estado distinto de `loading`/`ready`) se genera sin
 * ella: no se inventa una.
 *
 * El candado contra el doble clic es la propia mutación (`isPending`).
 */
export function useDocumentPdfDownload(document: DocumentPdfDescriptor, source: DocumentPdfSource) {
  const { sessionCompany, name, rfc } = useSessionCompanyDetails();
  const company: PdfCompany | null = name ? { name, rfc } : null;
  const companyPending =
    sessionCompany.status === "loading" || (sessionCompany.status === "ready" && name === null);

  const mutation = useMutation({
    mutationKey: ["document-pdf", document.type, document.id],
    mutationFn: async () => {
      const file = await source({ company });
      downloadBlob(
        file.blob,
        documentPdfFileName(file.document.type, file.document.folio, file.document.id),
      );
    },
    onSuccess: () => {
      toast.success("PDF generado y descargado correctamente");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "No se pudo generar el PDF del documento."));
    },
  });

  return {
    download: () => mutation.mutate(),
    isPending: mutation.isPending,
    companyPending,
  };
}
