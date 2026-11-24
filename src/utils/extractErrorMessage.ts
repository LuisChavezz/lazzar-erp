import { isAxiosError, type AxiosError } from "axios";
import { isChunkLoadError } from "./isChunkLoadError";
import { isRequestTimeoutError, REQUEST_TIMEOUT_MESSAGE } from "./requestTimeout";

export const CHUNK_LOAD_ERROR_MESSAGE =
  "No se pudo cargar parte de la aplicación. Recarga la página e intenta de nuevo.";

/**
 * Extrae el mensaje de error de un error de Axios o genérico.
 * El backend Django devuelve { error: string } en la respuesta JSON.
 *
 * De un error de Axios sin `{ error }` regresa el `fallback`, nunca su
 * `error.message` ("Request failed with status code 500", "Network Error"):
 * es texto técnico en inglés, no un mensaje para el usuario. Por lo mismo, de
 * un `ChunkLoadError` (falló la descarga de un `import()` dinámico) regresa
 * `CHUNK_LOAD_ERROR_MESSAGE` y no el "Failed to load chunk …" del bundler.
 * Una petición que venció su tope (`isRequestTimeoutError`, EC-939) regresa
 * `REQUEST_TIMEOUT_MESSAGE` antes que el `fallback`: el usuario sabe que puede
 * reintentar.
 */
export const extractErrorMessage = (error: unknown, fallback: string): string => {
  const axiosData = (error as AxiosError<{ error?: string }>)?.response?.data;
  if (axiosData?.error) return axiosData.error;
  if (isRequestTimeoutError(error)) return REQUEST_TIMEOUT_MESSAGE;
  if (isAxiosError(error)) return fallback;
  if (isChunkLoadError(error)) return CHUNK_LOAD_ERROR_MESSAGE;
  if (error instanceof Error) return error.message;
  return fallback;
};
