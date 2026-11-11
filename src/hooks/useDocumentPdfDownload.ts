"use client";

import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { requirePdfCompany, usePdfCompany } from "@/src/hooks/usePdfCompany";
import { documentPdfFileName } from "@/src/pdfs/shared/documentPdfFileName";
import type { DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import type { DocumentPdfSource } from "@/src/pdfs/shared/documentPdfSource";
import { downloadBlob } from "@/src/utils/downloadBlob";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";

/**
 * "Descargar PDF" de un documento (EC-855): obtiene el PDF de su fuente, lo
 * descarga como `<TIPO>-<folio>.pdf` y avisa con un toast.
 *
 * La empresa del encabezado sale de `usePdfCompany`: mientras se resuelve,
 * `companyPending` deshabilita el botón; si no hay datos reales de la empresa,
 * NO se genera el PDF —se avisa con un toast y se reintenta la búsqueda, así
 * que el siguiente clic ya puede descargar—.
 *
 * El candado contra el doble clic es la propia mutación (`isPending`).
 */
export function useDocumentPdfDownload(descriptor: DocumentPdfDescriptor, source: DocumentPdfSource) {
  const pdfCompany = usePdfCompany();

  const mutation = useMutation({
    mutationKey: ["document-pdf", descriptor.type, descriptor.id],
    mutationFn: async () => {
      const company = requirePdfCompany(pdfCompany);
      const file = await source({ company });
      downloadBlob(
        file.blob,
        documentPdfFileName(file.descriptor.type, file.descriptor.folio, file.descriptor.id),
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
    companyPending: pdfCompany.pending,
  };
}
