import type { AxiosError } from "axios";
import { drfFieldMessage, firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { firstNonBlankDrfMessage } from "@/src/utils/firstDrfMessage";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { forbiddenDetailMessage, isForbiddenError, isNotFoundError } from "@/src/utils/drfWriteErrors";

/**
 * Llaves con que las cancelaciones de WMS rechazan la acción por una regla de
 * negocio (nucleo-erp `cancelacion_service`, #1348 y EC-949): ya cancelado,
 * orden de cancelación (despacho → packing → picking), órdenes de trabajo vivas,
 * cadena de TR del surtido. Reintentar igual no sirve, salvo el cambio
 * concurrente, que pide reintentar (`isRetryableWmsCancelMessage`).
 */
const BLOCKING_KEYS = ["despacho", "packing", "picking", "transferencia"] as const;

/**
 * Un `400` de negocio que SÍ puede salir al reintentar: el backend lo dice en el
 * texto ("Intenta de nuevo", EC-949, cuando otro proceso cambió la TR mientras
 * se revertía). Se reconoce por la invitación a reintentar, sin acentos ni
 * mayúsculas, no por el mensaje completo.
 */
const RETRY_HINT = /(intenta(lo)? (de nuevo|otra vez|nuevamente)|vuelve a intentar|reintenta)/;

const normalize = (message: string) =>
  message
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const isRetryableWmsCancelMessage = (message: string): boolean => RETRY_HINT.test(normalize(message));

export const WMS_CANCEL_NOT_FOUND_MESSAGE = "El documento ya no está disponible o no tienes acceso a él.";
export const WMS_CANCEL_FORBIDDEN_MESSAGE = "No tienes permiso para cancelar documentos de almacén.";

/**
 * Qué hacer con un error de `cancelar/` o `revertir/` (EC-945):
 * - `motivo`: bajo el campo; el diálogo sigue abierto.
 * - `blocked`: un `400` con la llave del documento, o con la LISTA plana de
 *   `revertir/` sin stock en el destino (`["Inventario insuficiente …"]`).
 *   Toast con el mensaje tal cual, se cierra el diálogo y se relee todo.
 * - `retryable`: un `400` con la llave del documento que pide reintentar (cambio
 *   concurrente, `isRetryableWmsCancelMessage`). Toast tal cual, se relee todo y
 *   el diálogo sigue abierto con el motivo escrito.
 * - `not-found` (`404`: otra empresa o sucursal): igual que `blocked`.
 * - `forbidden` (`403`): toast con su `detail` tal cual; sigue abierto.
 * - `other` (red, 5xx, otro `400`): toast; sigue abierto con el motivo escrito.
 *
 * Los `400` de diccionario llegan con el valor como string plano; `drfFieldMessage`
 * acepta también la forma de lista.
 */
export type WmsCancelError =
  | { kind: "motivo"; message: string }
  | { kind: "blocked"; message: string }
  | { kind: "retryable"; message: string }
  | { kind: "not-found"; message: string }
  | { kind: "forbidden"; message: string }
  | { kind: "other"; message: string };

const badRequestBody = (error: unknown): unknown => {
  const response = (error as AxiosError)?.response;
  return response?.status === 400 ? response.data : undefined;
};

/**
 * `extraBlockingKeys` (opcional, EC-947): llaves de `400` de negocio propias de
 * una acción, además de las de WMS (p. ej. la reversa de calidad: `existencia`,
 * `orden_compra`…). Sin ellas, el comportamiento es el de siempre.
 */
export const classifyWmsCancelError = (
  error: unknown,
  fallback: string,
  extraBlockingKeys: readonly string[] = [],
): WmsCancelError => {
  if (isNotFoundError(error)) return { kind: "not-found", message: WMS_CANCEL_NOT_FOUND_MESSAGE };
  if (isForbiddenError(error)) {
    return { kind: "forbidden", message: forbiddenDetailMessage(error) ?? WMS_CANCEL_FORBIDDEN_MESSAGE };
  }
  const motivo = drfFieldMessage(error, "motivo");
  if (motivo) return { kind: "motivo", message: motivo };
  for (const key of [...BLOCKING_KEYS, ...extraBlockingKeys]) {
    const message = drfFieldMessage(error, key);
    if (message) return { kind: isRetryableWmsCancelMessage(message) ? "retryable" : "blocked", message };
  }
  const body = badRequestBody(error);
  if (Array.isArray(body)) {
    const message = firstNonBlankDrfMessage(body);
    if (message) return { kind: "blocked", message };
  }
  return {
    kind: "other",
    message: firstDrfFieldMessage(error) ?? extractErrorMessage(error, fallback),
  };
};

/** ¿El error cierra el diálogo? (el documento ya no se puede cancelar desde ahí). */
export const wmsCancelErrorClosesDialog = (error: WmsCancelError): boolean =>
  error.kind === "blocked" || error.kind === "not-found";
