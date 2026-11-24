import { DEFAULT_QUERY_RETRY } from "@/src/constants/queryCache";
import { isRequestTimeoutError } from "./requestTimeout";

/**
 * `retry` por defecto del `QueryClient` (`Provider.tsx`): `DEFAULT_QUERY_RETRY`
 * reintentos, salvo ante un timeout (`isRequestTimeoutError`, EC-939). Reintentar
 * una petición que ya esperó su tope entero duplicaba la espera antes de mostrar
 * el error (2 × 30 s + el `retryDelay`), y el usuario puede reintentar él mismo.
 * Cualquier otro fallo, incluidos los demás cortes de red, conserva el reintento.
 */
export const defaultQueryRetry = (failureCount: number, error: unknown): boolean =>
  !isRequestTimeoutError(error) && failureCount < DEFAULT_QUERY_RETRY;
