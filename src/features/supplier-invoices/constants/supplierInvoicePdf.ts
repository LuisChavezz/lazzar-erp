/**
 * Límite de tamaño del PDF de factura de proveedor que se adjunta.
 *
 * El backend acepta hasta 10 MB, pero corre en Vercel, que corta el cuerpo de
 * una Function en ~4.5 MB ANTES de que llegue a Django —y sin cabeceras CORS,
 * así que el navegador solo ve un error de red sin motivo—. El tope cuenta el
 * cuerpo multipart COMPLETO (boundary y cabeceras de la parte incluidos), así
 * que se fija en 4 MB para dejar holgura. Mismo criterio que
 * `MAX_EMBROIDERY_IMAGE_BYTES` (quotes), declarado aparte a propósito: son dos
 * cargas distintas y no deben moverse juntas.
 */
export const MAX_SUPPLIER_INVOICE_PDF_BYTES = 4 * 1024 * 1024;

/** Etiqueta legible del límite, para los mensajes de la UI. */
export const MAX_SUPPLIER_INVOICE_PDF_LABEL = "4 MB";

/** `accept` del selector de archivo. La extensión cubre sistemas que no reportan el MIME. */
export const SUPPLIER_INVOICE_PDF_ACCEPT = "application/pdf,.pdf";

/**
 * Nombre de RESPALDO del documento fusionado, si el `Content-Disposition` del
 * backend no se pudo leer (EC-919: se usa el suyo). Replica su regla
 * (`pdf_fusionado`, nucleo-erp #1233): `OC-RC-Factura-{folio o id}.pdf` con
 * OC, `SM-RC-Factura-…` en la de maquila, y sin prefijo si no tiene ninguna.
 */
export const mergedPdfFileName = (factura: {
  id: number;
  folio: string | null;
  oc: number | null;
  salida_maquila?: number | null;
}): string => {
  const prefijo = factura.oc != null ? "OC-" : factura.salida_maquila != null ? "SM-" : "";
  return `${prefijo}RC-Factura-${factura.folio || factura.id}.pdf`;
};
