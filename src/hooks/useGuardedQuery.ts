import {
  useQuery,
  type DefaultError,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useHasLoadedQuery } from "./useHasLoadedQuery";

interface GuardedQueryNotice {
  /** Único por hook consumidor — ver `useHasLoadedQuery`. */
  toastId: string;
  /** Texto del toast de refetch fallido; por defecto, el de `useHasLoadedQuery`. */
  errorMessage?: string;
}

/**
 * `useQuery` + `useHasLoadedQuery` en una sola llamada, para los hooks que NO
 * exponen el `isError` crudo: un refetch fallido conserva `data` con
 * `status: 'error'`, y pasar ese valor a la UI cambiaba lo ya cargado por un
 * error.
 *
 * - `isInitialError` solo es `true` si la consulta NUNCA cargó; un refetch
 *   fallido con datos en caché avisa por toast (una vez por racha de fallos).
 * - `error` sigue la misma regla: `null` salvo en una carga inicial fallida.
 * - `data` se devuelve tal cual (`undefined` hasta la primera respuesta
 *   exitosa). Cada hook decide su forma pública: una lista con nombre
 *   (`data ?? []`) o el `data` crudo cuando sus consumidores distinguen "aún
 *   no cargó" de "cargó vacío".
 * - `hasLoaded` es `true` solo con una respuesta real de ESTA llave. Con
 *   `placeholderData` (p. ej. `keepPreviousData`), `data` trae el placeholder
 *   de la llave anterior mientras llega la nueva: eso NO cuenta como cargado,
 *   e `isPlaceholderData` se expone para que el hook lo trate como carga.
 *
 * Las opciones de `useQuery` pasan sin tocar (`enabled`, `select`,
 * `staleTime`, `placeholderData`…).
 */
export const useGuardedQuery = <
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  { toastId, errorMessage }: GuardedQueryNotice,
) => {
  const {
    data,
    isLoading,
    isFetching,
    isPlaceholderData,
    isError,
    error,
    errorUpdatedAt,
    refetch,
  } = useQuery(options);

  const { hasLoaded, isInitialError } = useHasLoadedQuery({
    data: isPlaceholderData ? undefined : data,
    isError,
    errorUpdatedAt,
    toastId,
    errorMessage,
  });

  return {
    data,
    hasLoaded,
    isLoading,
    isFetching,
    isPlaceholderData,
    isInitialError,
    error: isInitialError ? error : null,
    refetch,
  };
};
