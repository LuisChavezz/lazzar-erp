import { isAxiosError, type AxiosError } from "axios";

/**
 * Extrae el mensaje de error de un error de Axios o genérico.
 * El backend Django devuelve { error: string } en la respuesta JSON.
 *
 * De un error de Axios sin `{ error }` regresa el `fallback`, nunca su
 * `error.message` ("Request failed with status code 500", "Network Error"):
 * es texto técnico en inglés, no un mensaje para el usuario.
 */
export const extractErrorMessage = (error: unknown, fallback: string): string => {
  const axiosData = (error as AxiosError<{ error?: string }>)?.response?.data;
  if (axiosData?.error) return axiosData.error;
  if (isAxiosError(error)) return fallback;
  if (error instanceof Error) return error.message;
  return fallback;
};
