import { AxiosError } from "axios";
import { handleDrfWriteError, isNotFoundError } from "@/src/utils/drfWriteErrors";
import { drfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import {
  RECALCULATE_CONSUMPTION_FORM_FIELDS,
  type RecalculateConsumptionField,
} from "../schemas/recalculate-consumption.schema";

export type SetRecalculateConsumptionFieldError = (
  field: RecalculateConsumptionField,
  message: string,
) => void;

const NOT_FOUND_MESSAGE = "No se encontró la orden de producción.";

export const RECALCULATE_CONSUMPTION_FALLBACK =
  "No se pudieron recalcular los consumos. Intenta de nuevo.";

/** Cuerpo de un 400 como diccionario, o `null` si no lo es. */
const badRequestBody = (error: unknown): Record<string, unknown> | null => {
  if (!(error instanceof AxiosError) || error.response?.status !== 400) return null;
  const data = error.response.data;
  return data && typeof data === "object" ? (data as Record<string, unknown>) : null;
};

/**
 * 400 `{ op: [...] }`: la OP ya no admite el recálculo (p. ej. se completó con
 * la página abierta). Quien lo recibe refresca el detalle para que la página
 * deje de ofrecer la acción.
 */
export const isRecalculateOpStateError = (error: unknown): boolean =>
  badRequestBody(error) !== null && drfFieldMessage(error, "op") !== undefined;

/**
 * Error del recálculo. Devuelve el mensaje a mostrar en el diálogo, o
 * `undefined` cuando todo lo que dijo el backend ya quedó bajo su campo.
 *
 * - 404 `{ msg }`: ese `msg` (la OP no existe).
 * - 400 `cantidad_real_corte` / `productos`: bajo su campo del formulario, vía
 *   `setFieldError`.
 * - 400 `permiso` / `op` / `inventario` (o cualquier otra llave que el
 *   formulario no muestra): su texto, tal cual.
 * - Red, 5xx u otra forma: el respaldo genérico.
 *
 * Modelado sobre `handleCriticalPathWriteError`, que mezcla el mismo `{ msg }`
 * con errores DRF por campo.
 */
export const handleRecalculateConsumptionError = (
  error: unknown,
  setFieldError: SetRecalculateConsumptionFieldError,
): string | undefined => {
  if (isNotFoundError(error)) {
    return drfFieldMessage(error, "msg") ?? NOT_FOUND_MESSAGE;
  }

  const message = handleDrfWriteError(
    error,
    RECALCULATE_CONSUMPTION_FALLBACK,
    RECALCULATE_CONSUMPTION_FORM_FIELDS,
    setFieldError,
  );

  // Si TODAS las llaves del 400 son campos del formulario, ya se pintaron bajo
  // su campo y repetir el respaldo genérico arriba solo estorbaría.
  const body = badRequestBody(error);
  const keys = body ? Object.keys(body) : [];
  const onlyFieldErrors =
    keys.length > 0 &&
    keys.every((key) =>
      (RECALCULATE_CONSUMPTION_FORM_FIELDS as readonly string[]).includes(key),
    );

  return onlyFieldErrors ? undefined : message;
};
