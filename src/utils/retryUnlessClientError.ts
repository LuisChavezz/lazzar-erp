import { DEFAULT_QUERY_RETRY } from "@/src/constants/queryCache";
import { isClientError } from "./drfWriteErrors";

/**
 * Política de `retry` para consultas por id: un 4xx (404 de un registro
 * inexistente o fuera del alcance del usuario) es determinista, así que
 * reintentarlo solo retrasa el error y repite la petición. El resto de fallos
 * (incluidos 408 y 429, ver `isClientError`) conserva el `retry` global de
 * `Provider.tsx` (`DEFAULT_QUERY_RETRY`).
 */
export const retryUnlessClientError = (failureCount: number, error: unknown) =>
  !isClientError(error) && failureCount < DEFAULT_QUERY_RETRY;
