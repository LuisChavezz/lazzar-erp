import { isAxiosError } from "axios";
import { isRequestTimeoutError } from "./requestTimeout";

/** Estatus de una puerta de enlace que cortó la petición (no responde Django). */
const GATEWAY_STATUSES = new Set([502, 503, 504]);

/**
 * ¿La petición se cortó sin una respuesta del backend? Sin respuesta (red
 * caída, CORS por un corte), timeout del cliente o un 502/503/504 de la puerta
 * de enlace. En una acción que escribe (timbrar el REP, cancelar un cobro) el
 * backend pudo haberla aplicado, así que su resultado es desconocido; en una
 * lectura (el CFDI oficial, `officialCfdiErrorMessage`) solo dice que el
 * archivo no llegó. Regla única para ambos (EC-859). El timeout se reconoce con
 * `isRequestTimeoutError` (`ETIMEDOUT` desde EC-939); un `ECONNABORTED` del
 * navegador tampoco trae respuesta, así que sigue contando.
 */
export const isActionOutcomeUnknown = (error: unknown): boolean => {
  if (!isAxiosError(error)) return false;
  if (isRequestTimeoutError(error)) return true;
  if (!error.response) return true;
  return GATEWAY_STATUSES.has(error.response.status);
};
