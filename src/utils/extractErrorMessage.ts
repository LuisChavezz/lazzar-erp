import type { AxiosError } from "axios";

/**
 * Extrae el mensaje de error de un error de Axios o genérico.
 * El backend Django devuelve { error: string } en la respuesta JSON.
 */
export const extractErrorMessage = (error: unknown, fallback: string): string => {
  const axiosData = (error as AxiosError<{ error?: string }>)?.response?.data;
  if (axiosData?.error) return axiosData.error;
  if (error instanceof Error) return error.message;
  return fallback;
};
