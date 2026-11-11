"use client";

import { useSessionCompanyDetails } from "@/src/features/workspace/hooks/useSessionCompanyDetails";
import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";

/** Mensaje cuando no hay datos reales de la empresa para el encabezado. */
export const PDF_COMPANY_ERROR_MESSAGE =
  "No se pudieron obtener los datos de la empresa para el encabezado del PDF. Se volvió a intentar; prueba de nuevo en un momento.";

/** Mensaje cuando la sesión no tiene empresa asignada. */
export const PDF_COMPANY_NONE_MESSAGE =
  "Tu usuario no tiene una empresa asignada, así que no puede generarse el PDF.";

/**
 * Empresa emisora del encabezado de un PDF (EC-855): la ACTIVA de la sesión,
 * con su nombre real y su RFC. La comparten "Descargar PDF" y el adjunto del
 * correo de la OC para que ambos apliquen la misma regla:
 *
 * - `pending`: aún no se sabe (sesión cargando o `mis-empresas/` en curso).
 *   Quien genera el PDF se deshabilita mientras tanto.
 * - `company`: hay un nombre REAL (de `mis-empresas/` o el guardado).
 * - `error`: no hay nombre real —la búsqueda falló o no encontró la empresa
 *   (el respaldo `Empresa #<id>` nunca cuenta), la sesión no se pudo leer o el
 *   usuario no tiene empresa—. No se genera el PDF: nunca sale un documento sin
 *   emisor o con un nombre inventado. `retry` vuelve a intentar la búsqueda (o
 *   la lectura de la sesión) cuando aplica.
 */
export function usePdfCompany(): {
  company: PdfCompany | null;
  pending: boolean;
  error: string | null;
  retry: () => void;
} {
  const { sessionCompany, name, rfc, isFallbackName, retryLookup } = useSessionCompanyDetails();
  const noop = () => {};

  if (sessionCompany.status === "loading" || (sessionCompany.status === "ready" && name === null)) {
    return { company: null, pending: true, error: null, retry: noop };
  }
  if (sessionCompany.status === "ready" && name !== null && !isFallbackName) {
    return { company: { name, rfc }, pending: false, error: null, retry: noop };
  }
  if (sessionCompany.status === "none") {
    return { company: null, pending: false, error: PDF_COMPANY_NONE_MESSAGE, retry: noop };
  }
  return {
    company: null,
    pending: false,
    error: PDF_COMPANY_ERROR_MESSAGE,
    retry: () => {
      if (sessionCompany.status === "ready") void retryLookup();
      else if ("retry" in sessionCompany) sessionCompany.retry();
    },
  };
}

/**
 * La empresa para generar el PDF, o un error que quien llama muestra en un
 * toast. Sin datos reales lanza (y relanza la búsqueda con `retry`); mientras
 * se resuelve también lanza, aunque quien llama ya debería estar deshabilitado.
 */
export function requirePdfCompany(pdfCompany: ReturnType<typeof usePdfCompany>): PdfCompany {
  if (pdfCompany.company) return pdfCompany.company;
  if (pdfCompany.error) {
    pdfCompany.retry();
    throw new Error(pdfCompany.error);
  }
  throw new Error("Todavía se están cargando los datos de la empresa. Intenta de nuevo en un momento.");
}
