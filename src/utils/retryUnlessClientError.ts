import { isClientError } from "./drfWriteErrors";
import { defaultQueryRetry } from "./defaultQueryRetry";

/**
 * Política de `retry` para consultas por id: un 4xx (404 de un registro
 * inexistente o fuera del alcance del usuario) es determinista, así que
 * reintentarlo solo retrasa el error y repite la petición. El resto de fallos
 * (incluidos 408 y 429, ver `isClientError`) conserva el `retry` global de
 * `Provider.tsx` (`defaultQueryRetry`), que tampoco reintenta un timeout.
 */
export const retryUnlessClientError = (failureCount: number, error: unknown) =>
  !isClientError(error) && defaultQueryRetry(failureCount, error);
