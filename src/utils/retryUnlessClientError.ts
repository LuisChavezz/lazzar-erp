import { isAxiosError } from "axios";

/**
 * Política de `retry` para consultas por id: un 4xx (404 de un registro
 * inexistente o fuera del alcance del usuario) es determinista, así que
 * reintentarlo solo retrasa el error y repite la petición. El resto de fallos
 * conserva el `retry: 1` global de `Provider.tsx`.
 */
export const retryUnlessClientError = (failureCount: number, error: unknown) => {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  if (status !== undefined && status >= 400 && status < 500) return false;
  return failureCount < 1;
};
