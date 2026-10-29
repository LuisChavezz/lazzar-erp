import { AxiosError } from "axios";
import { PrecheckError } from "@/src/hooks/useMutationLock";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { drfFieldMessage, firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import type { NotaCreditoEstatus } from "../interfaces/credit-note.interface";

/**
 * ¿El backend NO confirmó el resultado? Sin respuesta (red, timeout, o un 504
 * de la plataforma sin cabeceras CORS) o con un 5xx. Emitir y timbrar llaman a
 * Facturama: en estos casos el CFDI pudo generarse aunque la respuesta se
 * perdiera, así que no se puede decir "no se guardó nada". El cuerpo de estas
 * respuestas no es del backend (p. ej. la página de error de Vercel) y nunca
 * se muestra.
 */
export const isUnconfirmedFailure = (error: unknown): boolean =>
  error instanceof AxiosError && (!error.response || error.response.status >= 500);

/**
 * ¿Es un rechazo esperado? El precheck que detuvo la acción o un 4xx del
 * backend: ya se le avisa al usuario y no es un fallo del sistema, así que no
 * va a la consola.
 */
export const isExpectedError = (error: unknown): boolean =>
  error instanceof PrecheckError ||
  (error instanceof AxiosError &&
    error.response !== undefined &&
    error.response.status >= 400 &&
    error.response.status < 500);

/** Registra en consola solo los fallos inesperados (5xx, red, bugs). */
export const logUnexpectedError = (error: unknown) => {
  if (!isExpectedError(error)) console.error(error);
};

/** Timbrado sin confirmar: el backend pudo dejar la nota `cfdi_pendiente`. */
export const CREDIT_NOTE_STAMP_UNCONFIRMED_MESSAGE =
  "No se pudo confirmar el timbrado: el servidor no respondió a tiempo. Revisa el detalle de la nota antes de reintentar; si quedó pendiente de confirmación, un administrador debe revisarlo.";

/** Emisión sin confirmar: pudo emitirse y timbrarse aunque se perdiera la respuesta. */
export const CREDIT_NOTE_EMIT_UNCONFIRMED_MESSAGE =
  "No se pudo confirmar la emisión: el servidor no respondió a tiempo. Revisa el listado antes de reintentar; la nota pudo emitirse y timbrarse.";

/**
 * Nota que una emisión dejó guardada aunque su timbrado falló, tal como la
 * reporta el `400` del backend junto a `cfdi`: `nota_credito: {id, estatus}`
 * (nucleo-erp #724/#732). Solo ese par dice con certeza en qué quedó:
 *
 * - `Cancelada`: Facturama rechazó un alta `Emitida` (`POST`). La nota se
 *   canceló y la cuenta por cobrar quedó como estaba.
 * - `Borrador`: Facturama rechazó la emisión de un borrador (`PATCH`). Volvió a
 *   borrador y la cuenta por cobrar quedó como estaba.
 * - `Emitida`: Facturama no confirmó (timeout, 5xx, 408, sin UUID). La nota
 *   quedó emitida y aplicada, con el timbrado pendiente de confirmación.
 */
export interface StampFailedNota {
  id: number;
  estatus: NotaCreditoEstatus;
}

const NOTA_CREDITO_ESTATUSES: readonly NotaCreditoEstatus[] = ["Borrador", "Emitida", "Cancelada"];

/**
 * Lee `nota_credito` del cuerpo de un `400`, o `undefined` si falta o no tiene
 * la forma esperada. DRF convierte en texto cada valor de un `ValidationError`
 * anidado, así que `id` llega como `"15"`: se acepta string o número y se
 * normaliza con `Number()`. Un `estatus` desconocido se descarta: no se adivina
 * qué quedó.
 */
export const readStampFailedNota = (value: unknown): StampFailedNota | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const rawId = record.id;
  const id =
    typeof rawId === "number" || (typeof rawId === "string" && rawId.trim() !== "")
      ? Number(rawId)
      : NaN;
  const estatus = firstDrfMessage(record.estatus);
  if (!Number.isSafeInteger(id) || id <= 0) return undefined;
  if (!NOTA_CREDITO_ESTATUSES.includes(estatus as NotaCreditoEstatus)) return undefined;
  return { id, estatus: estatus as NotaCreditoEstatus };
};

/**
 * Timbrado fallido SIN `nota_credito` (o con uno que no corresponde al camino).
 * Normalmente no se guardó nada —el CFDI se valida dentro de la misma
 * transacción que aplica la nota—, pero el backend tiene caminos que responden
 * así con la nota ya emitida (la póliza o una carrera tras timbrar). No se
 * afirma nada: se pide revisar el listado.
 */
const STAMP_FAILED_UNKNOWN_COPY = {
  alta: "Falló el timbrado y no se pudo confirmar si la nota quedó registrada. Revisa el listado antes de capturarla de nuevo.",
  emision:
    "Falló el timbrado y no se pudo confirmar en qué estado quedó la nota. Revisa el listado antes de volver a intentarlo.",
} as const;

export const creditNoteStampFailedMessage = (
  camino: keyof typeof STAMP_FAILED_UNKNOWN_COPY,
  detail: string,
): string => `${STAMP_FAILED_UNKNOWN_COPY[camino]} Motivo: ${detail}`;

/** Alta `Emitida` rechazada por Facturama: la nota quedó `Cancelada`. */
export const creditNoteCreateRejectedMessage = (label: string, detail: string): string =>
  `Facturama rechazó el timbrado: la nota ${label} quedó cancelada y el saldo por cobrar de la factura no cambió. Corrige los datos y vuelve a emitirla; se registrará una nota nueva. Motivo: ${detail}`;

/** Emisión de un borrador rechazada por Facturama: la nota sigue en `Borrador`. */
export const creditNoteEmitRejectedMessage = (label: string): string =>
  `Facturama rechazó el timbrado: la nota ${label} sigue en borrador y el saldo por cobrar no cambió. El motivo está en su detalle.`;

/** Motivo del rechazo, en el detalle del borrador que se abre tras el rechazo. */
export const creditNoteEmitRejectedDetail = (detail: string): string =>
  `Facturama rechazó el timbrado y la nota sigue en borrador; el saldo por cobrar no cambió. Motivo: ${detail}`;

/**
 * Emisión que Facturama no confirmó: la nota quedó `Emitida` y aplicada con el
 * timbrado pendiente. `timbrar/` rechaza una nota con `cfdi_pendiente` (solo un
 * administrador lo desmarca tras revisar Facturama), así que no se ofrece
 * reintentar con "Timbrar".
 */
export const creditNoteStampPendingMessage = (label: string, detail: string): string =>
  `La nota ${label} se emitió y descontó su total del saldo por cobrar, pero Facturama no confirmó el timbrado: quedó pendiente de confirmación. Contacta a un administrador para revisarlo. Motivo: ${detail}`;

/**
 * Duración del toast de un timbrado fallido al emitir: el mensaje ronda los 300
 * caracteres con el motivo de Facturama, y los 4 s por defecto del
 * `<Toaster>` no alcanzan para leerlo.
 */
export const STAMP_FAILED_TOAST_DURATION_MS = 20_000;

/**
 * Alta `Emitida` sin confirmación del backend (sin respuesta, timeout, 5xx) o
 * con un `409` de concurrencia, que también puede salir del timbrado, DESPUÉS
 * de guardar. No se afirma qué quedó registrado.
 */
export const CREDIT_NOTE_CREATE_UNCONFIRMED_MESSAGE =
  "No se pudo confirmar el resultado de la emisión: la nota pudo quedar registrada. Revisa el listado antes de capturarla de nuevo.";

/**
 * Mensaje de un fallo de `timbrar/`, igual que `stampInvoiceErrorMessage`: el
 * motivo del backend tal cual bajo `cfdi` o `estatus`, luego cualquier campo, y
 * al final el extractor genérico. Un fallo sin confirmar no muestra el cuerpo.
 */
export const stampNotaCreditoErrorMessage = (error: unknown): string => {
  if (error instanceof PrecheckError) return error.message;
  if (isUnconfirmedFailure(error)) return CREDIT_NOTE_STAMP_UNCONFIRMED_MESSAGE;
  return (
    drfFieldMessage(error, "cfdi") ??
    drfFieldMessage(error, "estatus") ??
    firstDrfFieldMessage(error) ??
    extractErrorMessage(error, "No se pudo timbrar la nota de crédito.")
  );
};
