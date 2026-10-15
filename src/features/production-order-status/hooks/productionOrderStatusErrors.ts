import { AxiosError } from "axios";
import { handleDrfWriteError, isNotFoundError } from "@/src/utils/drfWriteErrors";
import { drfFieldMessage } from "@/src/utils/firstDrfFieldMessage";

export const CHANGE_STATUS_FALLBACK = "No se pudo cambiar el estatus. Intenta de nuevo.";

const NOT_FOUND_MESSAGE = "No se encontró la orden de producción.";

const INVALID_STATUS_MESSAGE =
  "El estatus elegido ya no es válido para esta orden. Actualiza la página e intenta de nuevo.";

const INVALID_TRANSITION_FALLBACK =
  "La orden cambió de estatus mientras tanto. Se actualizaron las opciones.";

const BLOCKED_FALLBACK = "Faltan requisitos de la ruta crítica.";

/**
 * Qué hacer con un error del POST `estatus/`:
 *
 * - `blocked`: 409 con `bloqueos` (faltan requisitos de la ruta crítica, p. ej.
 *   las opciones estaban viejas). Se muestra el diálogo de requisitos con lo
 *   que trae la respuesta.
 * - `invalid-transition`: 409 SIN `bloqueos` (el estatus cambió entre el GET y
 *   el POST). Se avisa con el `msg`, se cierra el diálogo y se releen el
 *   estatus y el detalle.
 * - `motivo`: 400 `{ motivo }`. Va bajo el campo del motivo.
 * - `message`: todo lo demás, con el texto a mostrar: el `msg` del 404, el
 *   `permiso` del 400 tal cual, un mensaje general para el 400 `estatus_op`,
 *   o el respaldo genérico (red, 5xx, otra forma).
 *
 * Los dos 409 se distinguen solo por la presencia de `bloqueos`.
 */
export type ChangeStatusErrorOutcome =
  | { kind: "blocked"; message: string; bloqueos: string[]; sePuedeForzar: boolean }
  | { kind: "invalid-transition"; message: string }
  | { kind: "motivo"; message: string }
  | { kind: "message"; message: string };

const responseBody = (error: unknown): Record<string, unknown> | null => {
  if (!(error instanceof AxiosError)) return null;
  const data = error.response?.data;
  return data && typeof data === "object" ? (data as Record<string, unknown>) : null;
};

const statusOf = (error: unknown): number | undefined =>
  error instanceof AxiosError ? error.response?.status : undefined;

/** Modelado sobre `handleRecalculateConsumptionError` (mismo `{ msg }` + DRF). */
export const classifyChangeStatusError = (error: unknown): ChangeStatusErrorOutcome => {
  const status = statusOf(error);
  const body = responseBody(error);

  if (status === 409) {
    const message = drfFieldMessage(error, "msg");
    if (body && Array.isArray(body.bloqueos)) {
      return {
        kind: "blocked",
        message: message ?? BLOCKED_FALLBACK,
        bloqueos: body.bloqueos.filter(
          (item): item is string => typeof item === "string" && item.trim() !== "",
        ),
        sePuedeForzar: body.se_puede_forzar === true,
      };
    }
    return { kind: "invalid-transition", message: message ?? INVALID_TRANSITION_FALLBACK };
  }

  if (isNotFoundError(error)) {
    return { kind: "message", message: drfFieldMessage(error, "msg") ?? NOT_FOUND_MESSAGE };
  }

  if (status === 400) {
    const motivo = drfFieldMessage(error, "motivo");
    if (motivo) return { kind: "motivo", message: motivo };
    // El texto del backend para `estatus_op` ("Estatus no válido.", "Requerido:
    // entero…") describe un error del cliente, no algo que la persona pueda
    // corregir: se cambia por uno general.
    if (drfFieldMessage(error, "estatus_op")) {
      return { kind: "message", message: INVALID_STATUS_MESSAGE };
    }
  }

  // 400 `permiso` (o cualquier otra llave): su texto, tal cual.
  return { kind: "message", message: handleDrfWriteError(error, CHANGE_STATUS_FALLBACK, []) };
};

/**
 * Qué relee quien recibe el error, o `null` si nada quedó viejo:
 * - `"status"`: 409 con `bloqueos` (faltan requisitos que las opciones decían
 *   cumplidos). El estatus no cambió, así que el detalle sigue vigente.
 * - `"status-and-detail"`: 409 sin `bloqueos` (el estatus cambió) o 404 (la OP
 *   dejó de ser visible).
 */
export const staleDataAfterStatusError = (
  error: unknown,
): "status" | "status-and-detail" | null => {
  const status = statusOf(error);
  if (status === 404) return "status-and-detail";
  if (status !== 409) return null;
  return Array.isArray(responseBody(error)?.bloqueos) ? "status" : "status-and-detail";
};
