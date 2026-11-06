import { AxiosError } from "axios";
import { PrecheckError } from "@/src/hooks/useMutationLock";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { forbiddenDetailMessage } from "@/src/utils/drfWriteErrors";
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
  "No se pudo confirmar el timbrado: el servidor no respondió a tiempo. Revisa el detalle de la nota antes de reintentar; si quedó pendiente de confirmación, concílialo con \"Conciliar con Facturama\".";

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

/**
 * Por qué una emisión no llegó a timbrarse y el backend revirtió la nota
 * (`nota_credito` con `Cancelada` o `Borrador`):
 * - `facturama`: Facturama rechazó el CFDI (el `400` trae `cfdi`).
 * - `otra`: otra petición cambió la nota o su factura entre la emisión y el
 *   timbre (nucleo-erp #751, `factura` o `estatus`).
 */
export type CreditNoteRevertCause = "facturama" | "otra";

/** La causa a partir del error normalizado: `cfdi` es el rechazo de Facturama. */
export const creditNoteRevertCause = (stampFailed: boolean | undefined): CreditNoteRevertCause =>
  stampFailed ? "facturama" : "otra";

/** Arranque de cada aviso de reversión, según la causa. */
const REVERT_LEAD: Record<CreditNoteRevertCause, string> = {
  facturama: "Facturama rechazó el timbrado",
  otra: "No se pudo timbrar",
};

/** Alta `Emitida` revertida: la nota quedó `Cancelada` y se registra una nueva al reenviar. */
export const creditNoteCreateRevertedMessage = (
  cause: CreditNoteRevertCause,
  label: string,
  detail: string,
): string =>
  `${REVERT_LEAD[cause]}: la nota ${label} quedó ${cause === "facturama" ? "cancelada" : "registrada como cancelada"} y el saldo por cobrar de la factura no cambió. Corrige los datos y vuelve a emitirla; se registrará una nota nueva. Motivo: ${detail}`;

/** Emisión de un borrador revertida: la nota sigue en `Borrador` (aviso breve). */
export const creditNoteEmitRevertedMessage = (cause: CreditNoteRevertCause, label: string): string =>
  `${REVERT_LEAD[cause]}: la nota ${label} sigue en borrador y el saldo por cobrar no cambió. El motivo está en su detalle.`;

/** Motivo de la reversión, en el detalle del borrador que se abre tras ella. */
export const creditNoteEmitRevertedDetail = (cause: CreditNoteRevertCause, detail: string): string =>
  `${REVERT_LEAD[cause]} y la nota sigue en borrador; el saldo por cobrar no cambió. Motivo: ${detail}`;

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
 * De dónde viene la emisión fallida, para decir qué NO repetir:
 * - `alta`: el formulario de nueva nota. Capturarla otra vez crearía una nota
 *   más y rebajaría el saldo otra vez.
 * - `emision`: "Emitir" sobre un borrador que ya existía. No se capturó nada;
 *   lo que no hay que hacer es volver a emitirla ni registrar una sustituta.
 */
export type EmitFailureFlow = "alta" | "emision";

/** Qué NO repetir en cada flujo (ver `EmitFailureFlow`). */
const NO_REPETIR: Record<EmitFailureFlow, string> = {
  alta: "No la captures de nuevo",
  emision: "No vuelvas a emitirla ni registres una nota sustituta",
};

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
 * En los tres casos repetir la operación rebajaría el saldo otra vez; el aviso
 * dice qué no repetir según el flujo (`EmitFailureFlow`).
 */
export const describeEmittedNotaCredito = (
  flow: EmitFailureFlow,
  label: string,
  detail: string,
  actual: EmittedNotaCreditoState | null,
): { kind: "pending" | "emitted" | "unknown"; message: string } => {
  const noRepetir = NO_REPETIR[flow];
  if (!actual || actual.estatus !== "Emitida") {
    return {
      kind: "unknown",
      message: `La nota ${label} quedó emitida y descontó su total del saldo por cobrar, pero no se pudo confirmar el estado de su timbrado. Revisa su detalle en el listado; ${noRepetir.charAt(0).toLowerCase()}${noRepetir.slice(1)}. Motivo: ${detail}`,
    };
  }
  if (actual.cfdi_pendiente === true && !actual.cfdi_uuid) {
    return { kind: "pending", message: creditNoteStampPendingMessage(label, detail) };
  }
  if (actual.cfdi_uuid) {
    return {
      kind: "emitted",
      message: `La nota ${label} se emitió, se timbró (UUID ${actual.cfdi_uuid}) y descontó su total del saldo por cobrar, pero el servidor reportó un error después del timbre. ${noRepetir}. Motivo: ${detail}`,
    };
  }
  return {
    kind: "emitted",
    message: `La nota ${label} quedó emitida sin CFDI y descontó su total del saldo por cobrar. ${noRepetir}; revisa su detalle. Motivo: ${detail}`,
  };
};

/**
 * Emisión que Facturama no confirmó: la nota quedó `Emitida` y aplicada con el
 * timbrado pendiente (`cfdi_pendiente`, confirmado en la nota fresca).
 * `timbrar/` la rechaza mientras siga así, así que no se ofrece reintentar: se
 * concilia desde su detalle (EC-709).
 */
export const creditNoteStampPendingMessage = (label: string, detail: string): string =>
  `La nota ${label} se emitió y descontó su total del saldo por cobrar, pero Facturama no confirmó el timbrado: quedó pendiente de confirmación. No vuelvas a emitirla: ábrela desde el listado de notas de crédito y usa "Conciliar con Facturama" en su detalle. Motivo: ${detail}`;

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

/** Conciliación sin confirmar: el backend pudo traer el timbre o liberarlo. */
export const CREDIT_NOTE_RECONCILE_UNCONFIRMED_MESSAGE =
  "No se pudo confirmar la conciliación: el servidor no respondió a tiempo. Revisa el detalle de la nota antes de reintentar.";

/**
 * Mensaje de un fallo de `conciliar-cfdi/` (EC-709), como
 * `stampNotaCreditoErrorMessage`: el motivo del backend tal cual bajo `cfdi`
 * (no hay pendiente, timbrado muy reciente, Facturama no respondió, varios
 * CFDIs iguales…), luego cualquier campo y al final el extractor genérico
 * (403, 404). Un fallo sin confirmar no muestra el cuerpo.
 */
export const reconcileNotaCreditoCfdiErrorMessage = (error: unknown): string => {
  if (error instanceof PrecheckError) return error.message;
  if (isUnconfirmedFailure(error)) return CREDIT_NOTE_RECONCILE_UNCONFIRMED_MESSAGE;
  return (
    drfFieldMessage(error, "cfdi") ??
    firstDrfFieldMessage(error) ??
    extractErrorMessage(error, "No se pudo conciliar el timbrado con Facturama.")
  );
};

/**
 * Mensaje de un fallo de `cancelar/` (EC-761), en el orden de
 * `cancelInvoiceErrorMessage` y con el `403` primero: `forbiddenDetailMessage`
 * (sin `E-FIN-FACTURAS`), el motivo del backend bajo `cfdi` tal cual (timbrado
 * sin confirmar, CFDI de egreso timbrado; DRF lo manda como lista y
 * `drfFieldMessage` lee las dos formas), luego `estatus`, cualquier otro campo
 * (`poliza`) o el `detail` (`404`, `409`) y al final el respaldo genérico.
 */
export const cancelNotaCreditoErrorMessage = (error: unknown): string => {
  if (error instanceof PrecheckError) return error.message;
  return (
    forbiddenDetailMessage(error) ??
    drfFieldMessage(error, "cfdi") ??
    drfFieldMessage(error, "estatus") ??
    firstDrfFieldMessage(error) ??
    extractErrorMessage(error, "Error al cancelar la nota de crédito")
  );
};
