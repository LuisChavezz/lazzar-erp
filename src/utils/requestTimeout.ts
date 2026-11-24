import { AxiosError, isAxiosError } from "axios";

/** Mensaje genérico de una petición que venció su tope de tiempo (EC-939). */
export const REQUEST_TIMEOUT_MESSAGE = "El servidor tardó demasiado en responder. Intenta de nuevo.";

/** El texto que Axios pone a un timeout cuando no hay `timeoutErrorMessage`. */
const AXIOS_TIMEOUT_MESSAGE = /timeout/i;

/**
 * ¿La petición venció su tope de tiempo (`timeout` de Axios)? Regla ÚNICA para
 * distinguir un timeout de los demás cortes sin respuesta (EC-939).
 *
 * - `ETIMEDOUT`: el código de un timeout en `v1_api` y `api`, que activan
 *   `transitional.clarifyTimeoutError`. Es también el de un corte por tiempo de
 *   la conexión en Node.
 * - `ECONNABORTED` cuenta SOLO si su mensaje es el del timeout ("timeout of
 *   30000ms exceeded"): es el código de un timeout en un cliente sin
 *   `clarifyTimeoutError`, pero también el de una petición que abortó el
 *   navegador ("Request aborted"), que no es un timeout.
 *
 * Una cancelación (`ERR_CANCELED`, la `signal` de TanStack Query al desmontar)
 * nunca es un timeout.
 */
export const isRequestTimeoutError = (error: unknown): boolean => {
  if (!isAxiosError(error)) return false;
  if (error.code === AxiosError.ETIMEDOUT) return true;
  return error.code === AxiosError.ECONNABORTED && AXIOS_TIMEOUT_MESSAGE.test(error.message);
};
