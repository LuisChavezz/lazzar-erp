import {
  MAX_SUPPLIER_INVOICE_PDF_BYTES,
  MAX_SUPPLIER_INVOICE_PDF_LABEL,
} from "../constants/supplierInvoicePdf";

/**
 * Validación de CLIENTE del PDF a adjuntar. Devuelve el motivo del rechazo en
 * español, o `null` si el archivo puede enviarse.
 *
 * Tipo: extensión `.pdf` CON CUALQUIER MIME, o MIME `application/pdf`. El MIME
 * lo decide el sistema operativo y no es fiable: hay equipos que reportan un PDF
 * real como `application/x-pdf`, `application/acrobat` o vacío. El `accept` del
 * input no basta (el diálogo permite "Todos los archivos"). Quien valida el
 * CONTENIDO es el backend (que empiece con `%PDF`).
 *
 * Tamaño: ver `MAX_SUPPLIER_INVOICE_PDF_BYTES` — por encima, Vercel rechaza la
 * petición sin que el navegador pueda leer el motivo.
 */
export function validateSupplierInvoicePdf(file: File): string | null {
  const isPdf = /\.pdf$/i.test(file.name) || file.type === "application/pdf";
  if (!isPdf) {
    return `"${file.name}" no es un PDF. Selecciona el PDF de la factura del proveedor.`;
  }
  if (file.size === 0) {
    return `"${file.name}" está vacío. Selecciona otro archivo.`;
  }
  if (file.size > MAX_SUPPLIER_INVOICE_PDF_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return `"${file.name}" pesa ${sizeMb} MB y el máximo es ${MAX_SUPPLIER_INVOICE_PDF_LABEL}. Comprime el PDF o usa una versión más ligera.`;
  }
  return null;
}
