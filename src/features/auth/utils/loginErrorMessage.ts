import { isRequestTimeoutError, REQUEST_TIMEOUT_MESSAGE } from "@/src/utils/requestTimeout";

/**
 * Toast de un fallo del login que no es la respuesta `400` de credenciales: un
 * timeout del cliente `api` (EC-939) dice que el servidor tardó; cualquier otro
 * fallo (red, 5xx) conserva "Error de conexión".
 */
export const loginErrorToastMessage = (error: unknown): string =>
  isRequestTimeoutError(error) ? REQUEST_TIMEOUT_MESSAGE : "Error de conexión";
