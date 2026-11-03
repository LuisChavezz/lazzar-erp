import { AxiosError } from "axios";
import { PrecheckError } from "@/src/hooks/useMutationLock";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { drfFieldMessage, firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import type { NotaCredito, NotaCreditoEstatus } from "../interfaces/credit-note.interface";

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
 * Nota que una emisión dejó guardada aunque falló, tal como la reporta el
 * `400` del backend: `nota_credito: {id, estatus}` (nucleo-erp #724/#732/#848),
 * junto a `cfdi` o a otra llave (`poliza`, `configuracion_contable`,
 * `cuenta_contable`, `factura`, `estatus`). Solo ese par dice con certeza en qué
 * quedó; NO trae `cfdi_uuid` ni `cfdi_pendiente` (para eso, la nota fresca):
 *
 * - `Cancelada`: un alta `Emitida` (`POST`) que Facturama rechazó o que otra
 *   petición cambió antes del timbre (#751). La nota se canceló y la cuenta por
 *   cobrar quedó como estaba.
 * - `Borrador`: la emisión de un borrador (`PATCH`) por las mismas causas.
 *   Volvió a borrador y la cuenta por cobrar quedó como estaba.
 * - `Emitida`: la nota quedó emitida y aplicada. O Facturama no confirmó
 *   (`cfdi_pendiente`), o se timbró y falló algo después (la póliza, #749).
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

/**
 * Alta `Emitida` que NO llegó a timbrarse por otra causa (nucleo-erp #751: otra
 * petición cambió la nota o su factura entre la emisión y el timbre): el
 * backend la canceló como en un rechazo de Facturama.
 */
export const creditNoteCreateCancelledMessage = (label: string, detail: string): string =>
  `No se pudo timbrar: la nota ${label} quedó registrada como cancelada y el saldo por cobrar de la factura no cambió. Corrige los datos y vuelve a emitirla; se registrará una nota nueva. Motivo: ${detail}`;

/** Emisión de un borrador rechazada por Facturama: la nota sigue en `Borrador`. */
export const creditNoteEmitRejectedMessage = (label: string): string =>
  `Facturama rechazó el timbrado: la nota ${label} sigue en borrador y el saldo por cobrar no cambió. El motivo está en su detalle.`;

/** Motivo del rechazo, en el detalle del borrador que se abre tras el rechazo. */
export const creditNoteEmitRejectedDetail = (detail: string): string =>
  `Facturama rechazó el timbrado y la nota sigue en borrador; el saldo por cobrar no cambió. Motivo: ${detail}`;

/** Emisión de un borrador que no llegó a timbrarse por otra causa (#751): sigue en `Borrador`. */
export const creditNoteEmitRevertedMessage = (label: string): string =>
  `No se pudo timbrar: la nota ${label} sigue en borrador y el saldo por cobrar no cambió. El motivo está en su detalle.`;

/** Motivo del #751, en el detalle del borrador que se abre tras el fallo. */
export const creditNoteEmitRevertedDetail = (detail: string): string =>
  `No se pudo timbrar y la nota sigue en borrador; el saldo por cobrar no cambió. Motivo: ${detail}`;

/** Emisión de un borrador que el backend reporta `Cancelada` (otra operación la canceló). */
export const creditNoteEmitCancelledMessage = (label: string, detail: string): string =>
  `No se pudo emitir: la nota ${label} quedó cancelada. Revisa el listado. Motivo: ${detail}`;

/**
 * Estado del timbre de una nota que la emisión dejó `Emitida`, leído de la nota
 * FRESCA (`fetchFreshNotaCredito`): el `400` solo trae `nota_credito: {id,
 * estatus}`, no `cfdi_uuid` ni `cfdi_pendiente`.
 */
export type EmittedNotaCreditoState = Pick<
  NotaCredito,
  "estatus" | "cfdi_uuid" | "cfdi_pendiente"
>;

/**
 * Qué decir de una nota que la emisión dejó `Emitida` y ya descontó su total
 * del saldo por cobrar, según su nota fresca. `kind`:
 *
 * - `pending`: Facturama no confirmó (`cfdi_pendiente`); el mismo aviso de
 *   siempre (`creditNoteStampPendingMessage`).
 * - `emitted`: timbrada (`cfdi_uuid`) o emitida sin CFDI; el error llegó
 *   DESPUÉS (p. ej. la póliza, #749). No se reintenta: la nota existe.
 * - `unknown`: no se pudo consultar la nota (`null`) o ya no está `Emitida`. Se
 *   pide revisar el listado.
 *
 * En los tres casos la nota NO debe capturarse de nuevo: rebajaría el saldo
 * otra vez.
 */
export const describeEmittedNotaCredito = (
  label: string,
  detail: string,
  actual: EmittedNotaCreditoState | null,
): { kind: "pending" | "emitted" | "unknown"; message: string } => {
  if (!actual || actual.estatus !== "Emitida") {
    return {
      kind: "unknown",
      message: `La nota ${label} quedó emitida y descontó su total del saldo por cobrar, pero no se pudo confirmar el estado de su timbrado. Revisa su detalle en el listado; no la captures de nuevo. Motivo: ${detail}`,
    };
  }
  if (actual.cfdi_pendiente === true && !actual.cfdi_uuid) {
    return { kind: "pending", message: creditNoteStampPendingMessage(label, detail) };
  }
  if (actual.cfdi_uuid) {
    return {
      kind: "emitted",
      message: `La nota ${label} se emitió, se timbró (UUID ${actual.cfdi_uuid}) y descontó su total del saldo por cobrar, pero el servidor reportó un error después del timbre. No la captures de nuevo. Motivo: ${detail}`,
    };
  }
  return {
    kind: "emitted",
    message: `La nota ${label} quedó emitida sin CFDI y descontó su total del saldo por cobrar. No la captures de nuevo; revisa su detalle. Motivo: ${detail}`,
  };
};

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
