import { isAxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { forbiddenDetailMessage } from "@/src/utils/drfWriteErrors";

/**
 * Mensaje del backend para el cuerpo de error de la lista:
 * - 400 `{campo: "mensaje"}` (string plano por campo, p. ej.
 *   `{"sucursal": "No es una sucursal de tu empresa."}`): los mensajes tal
 *   cual, unidos con " · ".
 * - 403 `{"detail": …}`: su `detail` tal cual.
 * Para cualquier otro error devuelve `undefined` y la tabla usa su mensaje de
 * siempre (`extractErrorMessage`).
 */
export const digitalStockErrorMessage = (error: unknown): string | undefined => {
  const forbidden = forbiddenDetailMessage(error);
  if (forbidden) return forbidden;
  if (!isAxiosError(error) || error.response?.status !== 400) return undefined;
  const data = error.response.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  const messages = Object.values(data as Record<string, unknown>)
    .map((value) => firstDrfMessage(value)?.trim())
    .filter((message): message is string => Boolean(message));
  return messages.length > 0 ? messages.join(" · ") : undefined;
};
