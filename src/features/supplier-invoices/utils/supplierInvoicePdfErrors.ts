import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { MAX_SUPPLIER_INVOICE_PDF_LABEL } from "../constants/supplierInvoicePdf";
import {
  parseSupplierInvoiceError,
  supplierInvoiceErrorToastMessage,
} from "./parseSupplierInvoiceError";

const NOT_FOUND_MESSAGE =
  "La factura ya no está disponible; es posible que se haya eliminado. Se actualizó el listado.";

/**
 * Mensaje de un 4xx con cuerpo DRF: primero la llave propia del endpoint
 * (`archivo` en la subida, `pdf_adjunto` en la descarga) y, si no viene, el
 * parser general del módulo (detail / non_field_errors / llaves desconocidas).
 */
const drfClientErrorMessage = (error: AxiosError, key: string, fallback: string): string => {
  const data = error.response?.data;
  // Sin cuerpo legible (p. ej. una página HTML que `readBlobErrorBody` descartó):
  // el mensaje de respaldo de la operación, no el genérico de Axios.
  if (data === undefined || data === null || data === "") return fallback;
  const own =
    data && typeof data === "object" && !Array.isArray(data)
      ? firstDrfMessage((data as Record<string, unknown>)[key])
      : undefined;
  if (own) return own;
  return supplierInvoiceErrorToastMessage(parseSupplierInvoiceError(error, fallback), fallback);
};

/** Código HTTP del error, si hubo respuesta. */
export const errorStatus = (error: unknown): number | undefined =>
  error instanceof AxiosError ? error.response?.status : undefined;

/** Mensaje del error de `POST .../adjuntar-pdf/`. */
export const uploadPdfErrorMessage = (error: unknown): string => {
  const fallback = "No se pudo adjuntar el PDF de la factura.";
  if (!(error instanceof AxiosError)) {
    return error instanceof Error && error.message ? error.message : fallback;
  }
  const status = error.response?.status;
  // Sin respuesta: casi siempre Vercel cortó un cuerpo demasiado grande antes de
  // Django (y sin CORS el navegador no puede leer el 413), o se cayó la red.
  if (!error.response || status === 413) {
    return `No se pudo enviar el archivo. Es posible que supere el tamaño permitido (${MAX_SUPPLIER_INVOICE_PDF_LABEL}) o que se haya perdido la conexión. Intenta de nuevo.`;
  }
  if (status === 404) return NOT_FOUND_MESSAGE;
  if (status !== undefined && status >= 500) {
    return "El servidor no pudo guardar el PDF. Intenta de nuevo en unos momentos.";
  }
  return drfClientErrorMessage(error, "archivo", fallback);
};

/** Mensaje del error de `GET .../pdf-fusionado/` (cuerpo ya decodificado por `readBlobErrorBody`). */
export const mergedPdfErrorMessage = (error: unknown): string => {
  const fallback = "No se pudo descargar el documento OC + RC + factura.";
  if (!(error instanceof AxiosError)) {
    return error instanceof Error && error.message ? error.message : fallback;
  }
  const status = error.response?.status;
  if (!error.response) {
    return "No se pudo conectar con el servidor para generar el documento. Revisa tu conexión e intenta de nuevo.";
  }
  if (status === 404) return NOT_FOUND_MESSAGE;
  // Un PDF adjunto dañado o cifrado hace fallar la fusión con 500 hasta que se
  // adjunte otro: es el único arreglo al alcance del usuario.
  if (status !== undefined && status >= 500) {
    return "No se pudo generar el documento OC + RC + factura. Si el problema persiste, vuelve a adjuntar el PDF de la factura: el archivo actual puede estar dañado o protegido con contraseña.";
  }
  return drfClientErrorMessage(error, "pdf_adjunto", fallback);
};
