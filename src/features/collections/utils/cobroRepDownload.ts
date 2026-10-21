import { isAxiosError } from "axios";
import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasPermission } from "@/src/utils/permissions";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { COBRO_REP_DOWNLOAD_PERMISSION } from "../constants/collectionPermissions";
import type { Cobro, CobroRepFileFormat } from "../interfaces/collection.interface";

type CobroRepFileState = Pick<Cobro, "rep_uuid" | "rep_facturama_id">;

/**
 * ¿El REP del cobro está timbrado y se puede pedir su archivo? Hacen falta LOS
 * DOS campos: el backend guarda `rep_facturama_id` aunque Facturama responda sin
 * UUID (timbrado pendiente), y ese id no es un REP confirmado.
 */
export const hasCobroRepFile = (cobro: CobroRepFileState): boolean =>
  Boolean(cobro.rep_uuid) && Boolean(cobro.rep_facturama_id);

/** ¿Se ofrecen "Descargar PDF/XML" del REP a ESTE usuario para ESTE cobro? */
export const canDownloadCobroRep = (
  cobro: CobroRepFileState,
  user: PermissionContext | null | undefined,
): boolean => hasPermission(COBRO_REP_DOWNLOAD_PERMISSION, user) && hasCobroRepFile(cobro);

/** Nota en la sección del REP cuando está timbrado pero el usuario no puede descargarlo. */
export const COBRO_REP_DOWNLOAD_FORBIDDEN_MESSAGE = "La descarga del REP requiere acceso a Facturama.";

/** MIME del archivo descargado: sale del formato pedido, no del `ContentType` de Facturama. */
export const COBRO_REP_FILE_MIME: Record<CobroRepFileFormat, string> = {
  pdf: "application/pdf",
  xml: "application/xml",
};

/** Nombre del archivo: el passthrough no manda ninguno. */
export const cobroRepFileName = (repUuid: string, format: CobroRepFileFormat): string =>
  `REP-${repUuid}.${format}`;

/** El passthrough respondió, pero sin un archivo base64 que se pueda decodificar. */
export class CobroRepFileUnreadableError extends Error {
  constructor() {
    super("Facturama entregó un archivo vacío o ilegible.");
  }
}

/**
 * Mensaje de un fallo al descargar el REP, en este orden:
 *
 * 1. 403: el `detail` del backend ("No tienes acceso a Facturama.").
 * 2. 502: Facturama no respondió (timeout, red o 5xx).
 * 3. Otro estatus con el cuerpo del passthrough (`{ error: "FACTURAMA_…",
 *    message, details }`): Facturama rechazó la petición. `error` es un código y
 *    `message` un texto genérico en inglés del cliente del backend, así que no
 *    se muestran tal cual.
 * 4. El archivo llegó vacío o no es base64.
 * 5. Errores DRF (400 del serializer) y, al final, el extractor genérico.
 */
export const downloadCobroRepErrorMessage = (error: unknown): string => {
  if (error instanceof CobroRepFileUnreadableError) return error.message;
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as { error?: unknown } | undefined;
    if (status === 403) {
      return firstDrfFieldMessage(error) ?? "No tienes acceso a Facturama.";
    }
    if (status === 502) return "Facturama no entregó el archivo. Intenta de nuevo más tarde.";
    if (typeof data?.error === "string" && data.error.startsWith("FACTURAMA_")) {
      return `Facturama no entregó el archivo del REP (HTTP ${status}).`;
    }
    if (!error.response) return "No se recibió respuesta del servidor. Intenta de nuevo.";
  }
  return firstDrfFieldMessage(error) ?? extractErrorMessage(error, "No se pudo descargar el REP.");
};
