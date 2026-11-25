import type { AxiosError } from "axios";
import { drfFieldMessage, firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { firstNonBlankDrfMessage } from "@/src/utils/firstDrfMessage";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { forbiddenDetailMessage, isForbiddenError, isNotFoundError } from "@/src/utils/drfWriteErrors";

/**
 * Un `400` de negocio que SÍ puede salir al reintentar: el backend lo dice en el
 * texto ("Intenta de nuevo", EC-949, cuando otro proceso cambió el documento a
 * media acción). Se reconoce por la invitación a reintentar, sin acentos ni
 * mayúsculas, no por el mensaje completo.
 */
const RETRY_HINT = /(intenta(lo)? (de nuevo|otra vez|nuevamente)|vuelve a intentar|reintenta)/;

const normalize = (message: string) =>
  message
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export const isRetryableCancelMessage = (message: string): boolean => RETRY_HINT.test(normalize(message));

/**
 * Qué hacer con un error de una cancelación con motivo (o de la reversa de una
 * TR, que se comporta igual):
 * - `motivo`: bajo el campo; el diálogo sigue abierto.
 * - `blocked`: un `400` con una de las `blockingKeys` de la acción (ya
 *   cancelado, un documento posterior que hay que cancelar primero…), o una
 *   LISTA plana (`["Inventario insuficiente …"]`). Su mensaje va tal cual y se
 *   relee lo que el documento toca.
 * - `retryable`: un `400` con una de esas llaves que pide reintentar
 *   (`isRetryableCancelMessage`). Tal cual, se relee y el diálogo sigue abierto.
 * - `not-found` (`404`: otra empresa o sucursal): como `blocked`.
 * - `forbidden` (`403`): su `detail` tal cual; sigue abierto.
 * - `other` (red, 5xx, otro `400`): sigue abierto con el motivo escrito.
 *
 * Los `400` de diccionario llegan con el valor como string plano;
 * `drfFieldMessage` acepta también la forma de lista.
 */
export type CancelError =
  | { kind: "motivo"; message: string }
  | { kind: "blocked"; message: string }
  | { kind: "retryable"; message: string }
  | { kind: "not-found"; message: string }
  | { kind: "forbidden"; message: string }
  | { kind: "other"; message: string };

export interface CancelErrorMessages {
  /** Sin mensaje del backend (red, 5xx). */
  fallback: string;
  /** El `404`: el documento ya no está o es de otra empresa. */
  notFound: string;
  /** Un `403` sin `detail`. */
  forbidden: string;
}

const badRequestBody = (error: unknown): unknown => {
  const response = (error as AxiosError)?.response;
  return response?.status === 400 ? response.data : undefined;
};

export const classifyCancelError = (
  error: unknown,
  { blockingKeys, messages }: { blockingKeys: readonly string[]; messages: CancelErrorMessages },
): CancelError => {
  if (isNotFoundError(error)) return { kind: "not-found", message: messages.notFound };
  if (isForbiddenError(error)) {
    return { kind: "forbidden", message: forbiddenDetailMessage(error) ?? messages.forbidden };
  }
  const motivo = drfFieldMessage(error, "motivo");
  if (motivo) return { kind: "motivo", message: motivo };
  for (const key of blockingKeys) {
    const message = drfFieldMessage(error, key);
    if (message) return { kind: isRetryableCancelMessage(message) ? "retryable" : "blocked", message };
  }
  const body = badRequestBody(error);
  if (Array.isArray(body)) {
    const message = firstNonBlankDrfMessage(body);
    if (message) return { kind: "blocked", message };
  }
  return {
    kind: "other",
    message: firstDrfFieldMessage(error) ?? extractErrorMessage(error, messages.fallback),
  };
};

/** ¿El error dice que el documento ya no se puede cancelar desde ahí? */
export const cancelErrorClosesDialog = (error: CancelError): boolean =>
  error.kind === "blocked" || error.kind === "not-found";

/** ¿El error dice que lo que hay en caché está viejo? (se relee). */
export const cancelErrorMeansStaleCache = (error: CancelError): boolean =>
  error.kind === "blocked" || error.kind === "not-found" || error.kind === "retryable";

/**
 * Dónde se muestra un error de la mutación (`useCancelMutation`): `motivo` bajo
 * el campo si hay quién lo pinte; un `400` de negocio en el diálogo si se pidió
 * (`keepOpenOnBlocked`); todo lo demás, en un toast.
 */
export const cancelErrorTarget = (
  error: CancelError,
  { hasMotivoHandler, hasBlockedHandler }: { hasMotivoHandler: boolean; hasBlockedHandler: boolean },
): "motivo" | "dialog" | "toast" => {
  if (error.kind === "motivo" && hasMotivoHandler) return "motivo";
  if ((error.kind === "blocked" || error.kind === "retryable") && hasBlockedHandler) return "dialog";
  return "toast";
};

/**
 * ¿El diálogo se cierra tras el error? Por defecto (WMS) cierran `blocked` y
 * `not-found`; con `keepOpenOnBlocked` solo `not-found`: el `400` de negocio
 * se queda en el aviso con el motivo escrito.
 */
export const cancelDialogClosesOnError = (error: CancelError, keepOpenOnBlocked: boolean): boolean =>
  keepOpenOnBlocked ? error.kind === "not-found" : cancelErrorClosesDialog(error);
