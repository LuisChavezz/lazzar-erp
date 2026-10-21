import { isAxiosError } from "axios";

/** Estatus de una puerta de enlace que cortó la petición (no responde Django). */
const GATEWAY_STATUSES = new Set([502, 503, 504]);

/**
 * ¿La petición de una acción sobre el cobro (timbrar el REP, cancelar) se cortó
 * sin una respuesta del backend? Sin respuesta (red caída, CORS por un corte),
 * timeout del cliente o un 502/503/504 de la puerta de enlace: en todos el
 * backend pudo haber aplicado la acción, así que su resultado es desconocido.
 */
export const isActionOutcomeUnknown = (error: unknown): boolean => {
  if (!isAxiosError(error)) return false;
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") return true;
  if (!error.response) return true;
  return GATEWAY_STATUSES.has(error.response.status);
};
