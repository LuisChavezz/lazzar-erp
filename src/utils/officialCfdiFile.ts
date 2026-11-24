/**
 * Archivo OFICIAL de un CFDI timbrado (EC-859): el PDF o el XML que entrega
 * Facturama, no un PDF que arme el ERP. Lo comparten "Descargar CFDI" de la
 * factura (`GET /finanzas/facturas/{id}/cfdi/`) y de la nota de crédito, y la
 * descarga del REP de un cobro (passthrough `facturama/cfdi/...`). Ambos
 * endpoints responden el objeto de Facturama tal cual: JSON con el archivo en
 * base64 en `Content`, sin nombre de archivo. Módulo puro, para `tests/unit/`.
 */
import { isAxiosError } from "axios";
import { isActionOutcomeUnknown } from "@/src/utils/actionOutcome";
import { base64ToBlob } from "@/src/utils/base64ToBlob";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { forbiddenDetailMessage, isForbiddenError } from "@/src/utils/drfWriteErrors";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { isRequestTimeoutError } from "@/src/utils/requestTimeout";

export type CfdiFileFormat = "pdf" | "xml";

/**
 * Respuesta de Facturama tal cual. Solo se declara lo que se lee: el valor
 * exacto de `ContentType` no está garantizado y no se usa (el MIME sale del
 * formato pedido).
 */
export interface FacturamaCfdiFile {
  /** Archivo en base64 puro. */
  Content: string;
  ContentType?: string;
}

/** MIME del archivo descargado: sale del formato pedido, no del `ContentType` de Facturama. */
export const CFDI_FILE_MIME: Record<CfdiFileFormat, string> = {
  pdf: "application/pdf",
  xml: "application/xml",
};

/** Facturama respondió, pero sin un archivo base64 que se pueda decodificar. */
export class CfdiFileUnreadableError extends Error {
  constructor() {
    super("Facturama entregó un archivo vacío o ilegible.");
  }
}

/** Decodifica la respuesta de Facturama; lanza `CfdiFileUnreadableError` si no trae archivo. */
export const cfdiFileToBlob = (file: unknown, format: CfdiFileFormat): Blob => {
  const content = (file as Partial<FacturamaCfdiFile> | null | undefined)?.Content;
  if (typeof content !== "string" || content.trim() === "") throw new CfdiFileUnreadableError();
  try {
    return base64ToBlob(content, CFDI_FILE_MIME[format]);
  } catch {
    throw new CfdiFileUnreadableError();
  }
};

/**
 * Mensaje de un fallo al descargar el CFDI oficial; `ofDocument` completa la
 * frase ("del REP", "de la factura"…). En este orden:
 *
 * 1. El archivo llegó vacío o no es base64.
 * 2. 403: el `detail` (o el motivo DRF) del backend.
 * 3. Sin respuesta del backend (red caída, CORS por un corte).
 * 4. Timeout del cliente o 502/503/504 (`isActionOutcomeUnknown`): Facturama o
 *    la puerta de enlace no entregaron el archivo. Si el backend explica el
 *    motivo (`{"cfdi": "Facturama no entregó el archivo: …"}` de
 *    `facturas/{id}/cfdi/`), se muestra ese; si no, el genérico. Leer es
 *    seguro, así que no se usa la redacción de "resultado desconocido" de las
 *    acciones que escriben.
 * 5. Cuerpo del passthrough (`{ error: "FACTURAMA_…", message, details }`):
 *    Facturama rechazó la petición; `message` es un texto genérico en inglés.
 * 6. Errores DRF (`{"cfdi": "La factura no tiene CFDI timbrado."}`) y, al
 *    final, el extractor genérico.
 */
export const officialCfdiErrorMessage = (error: unknown, ofDocument: string): string => {
  if (error instanceof CfdiFileUnreadableError) return error.message;
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as { error?: unknown } | undefined;
    if (isForbiddenError(error)) {
      return forbiddenDetailMessage(error) ?? `No tienes permiso para descargar el CFDI ${ofDocument}.`;
    }
    // Un `ECONNABORTED` del navegador ("Request aborted") no es un timeout: cae en
    // "No se recibió respuesta" (EC-939).
    if (!error.response && !isRequestTimeoutError(error)) return "No se recibió respuesta del servidor. Intenta de nuevo.";
    if (isActionOutcomeUnknown(error)) {
      // El cuerpo del passthrough (`error: "FACTURAMA_…"`) no es un mensaje para el usuario.
      const reason = typeof data?.error === "string" ? undefined : firstDrfFieldMessage(error);
      return reason ?? "Facturama no entregó el archivo. Intenta de nuevo más tarde.";
    }
    if (typeof data?.error === "string" && data.error.startsWith("FACTURAMA_")) {
      return `Facturama no entregó el CFDI ${ofDocument} (HTTP ${status}).`;
    }
  }
  return firstDrfFieldMessage(error) ?? extractErrorMessage(error, `No se pudo descargar el CFDI ${ofDocument}.`);
};

/**
 * ¿El documento tiene un CFDI timbrado que se pueda pedir? Hacen falta LOS DOS
 * campos: el backend guarda el id de Facturama aunque responda sin UUID
 * (timbrado pendiente), y ese id no es un CFDI confirmado.
 */
export const hasOfficialCfdi = (uuid: string | null | undefined, facturamaId: string | null | undefined): boolean =>
  Boolean(uuid) && Boolean(facturamaId);

/**
 * Nombre del CFDI oficial de un documento con PDF propio: el del PDF del ERP
 * con `-CFDI` y la extensión del formato (`FAC-F-00094.pdf` →
 * `FAC-F-00094-CFDI.pdf` / `FAC-F-00094-CFDI.xml`), para que no se confunda
 * con el PDF del ERP ni se pisen en la carpeta de descargas. Lo usan la
 * factura y la nota de crédito; el REP, que no tiene PDF del ERP, se nombra
 * aparte (`cobroRepFileName`).
 */
export const officialCfdiFileName = (pdfFileName: string, format: CfdiFileFormat): string =>
  pdfFileName.replace(/\.pdf$/, `-CFDI.${format}`);
