import { useEffect, useSyncExternalStore } from "react";
import {
  useQuery,
  useQueryClient,
  type DefaultError,
  type QueryCache,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useHasLoadedQuery } from "./useHasLoadedQuery";

interface GuardedQueryNotice<TError = DefaultError> {
  /** Único por hook consumidor — ver `useHasLoadedQuery`. */
  toastId: string;
  /** Texto del toast de refetch fallido; por defecto, el de `useHasLoadedQuery`. */
  errorMessage?: string;
  /**
   * OPCIONAL. Marca ciertos errores como DEFINITIVOS: la respuesta ya dijo todo
   * lo que había que decir y reintentar o conservar lo anterior sería mentir.
   * El caso típico es el 404 de un detalle (`isNotFoundError`): el registro no
   * existe, se dio de baja o no es visible para el usuario.
   *
   * Con un error definitivo, la consulta:
   * - no se reintenta;
   * - no avisa por toast ni cuenta como error inicial: se expone aparte, en
   *   `isDefinitiveError`;
   * - NO conserva los datos anteriores (`data` es `undefined`), aunque el error
   *   llegue en un refetch con datos ya cargados;
   * - sigue siendo definitiva si el siguiente intento falla por otra cosa (un
   *   500, la red): solo una respuesta exitosa la levanta.
   *
   * Sin esta opción el hook se comporta exactamente igual que siempre.
   */
  isDefinitiveError?: (error: TError) => boolean;
}

/**
 * Momento (`errorUpdatedAt`) del último error definitivo visto por consulta
 * (`queryHash`). Hace falta fuera de la caché de TanStack porque el estado de
 * una consulta solo guarda su ÚLTIMO error: tras un 404 seguido de un 500, la
 * consulta dice "500 con datos viejos" y, sin esta memoria, la pantalla
 * resucitaría el registro. Vive a nivel de módulo para que también lo sepa una
 * instancia que se monta después (como `notifiedFailures` en
 * `useHasLoadedQuery`), y se lee con `useSyncExternalStore` porque es estado
 * mutable externo a React.
 *
 * Una entrada se borra cuando la consulta responde bien, y cuando TanStack la
 * QUITA de su caché (`watchRemovedQueries`): sin consulta no hay datos viejos
 * que proteger. El tope es solo una red de seguridad.
 */
const MAX_DEFINITIVE_ERRORS = 100;
const definitiveErrorAt = new Map<string, number>();
const definitiveErrorListeners = new Set<() => void>();

const subscribeToDefinitiveErrors = (listener: () => void) => {
  definitiveErrorListeners.add(listener);
  return () => {
    definitiveErrorListeners.delete(listener);
  };
};

const setDefinitiveErrorAt = (queryHash: string, at: number | undefined) => {
  if (definitiveErrorAt.get(queryHash) === at) return;
  if (at === undefined) {
    definitiveErrorAt.delete(queryHash);
  } else {
    // Se reinserta para que el orden del Map sea el de la última marca, y al
    // pasar del tope se descarta la más vieja.
    definitiveErrorAt.delete(queryHash);
    definitiveErrorAt.set(queryHash, at);
    if (definitiveErrorAt.size > MAX_DEFINITIVE_ERRORS) {
      const oldest = definitiveErrorAt.keys().next().value;
      if (oldest !== undefined) definitiveErrorAt.delete(oldest);
    }
  }
  definitiveErrorListeners.forEach((listener) => listener());
};

/** Cachés de TanStack ya vigiladas (una suscripción por `QueryClient`). */
const watchedQueryCaches = new WeakSet<QueryCache>();

/** Olvida la marca de cada consulta que TanStack quita de su caché. */
const watchRemovedQueries = (queryCache: QueryCache) => {
  if (watchedQueryCaches.has(queryCache)) return;
  watchedQueryCaches.add(queryCache);
  queryCache.subscribe((event) => {
    if (event.type === "removed") setDefinitiveErrorAt(event.query.queryHash, undefined);
  });
};

const NO_DEFINITIVE_ERROR = 0;

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
 * - `isDefinitiveError` solo puede ser `true` si se pasó la opción del mismo
 *   nombre (ver `GuardedQueryNotice`); mientras lo es, `data` es `undefined`,
 *   `hasLoaded` e `isInitialError` son `false` y no hay toast.
 *
 * Las opciones de `useQuery` pasan sin tocar (`enabled`, `select`,
 * `staleTime`, `placeholderData`…). Con `isDefinitiveError`, `retry` se
 * envuelve para no reintentar esos errores; el resto de fallos conserva el
 * `retry` recibido (o el del `QueryClient`).
 */
export const useGuardedQuery = <
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  { toastId, errorMessage, isDefinitiveError }: GuardedQueryNotice<TError>,
) => {
  const queryClient = useQueryClient();

  const guardedOptions: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey> =
    isDefinitiveError
      ? {
          ...options,
          retry: (failureCount, retryError) => {
            if (isDefinitiveError(retryError)) return false;
            // El `retry` que habría aplicado sin la opción: el recibido, el del
            // `QueryClient` o el de TanStack (3).
            const retry = options.retry ?? queryClient.getDefaultOptions().queries?.retry ?? 3;
            if (typeof retry === "function") {
              return (retry as (count: number, failure: TError) => boolean)(
                failureCount,
                retryError,
              );
            }
            return typeof retry === "number" ? failureCount < retry : retry;
          },
        }
      : options;

  const {
    data,
    dataUpdatedAt,
    isLoading,
    isFetching,
    isPlaceholderData,
    isError,
    error,
    errorUpdatedAt,
    refetch,
  } = useQuery(guardedOptions);

  // Sin la opción no hay nada que recordar: `queryHash` vacío y la lectura
  // devuelve siempre `NO_DEFINITIVE_ERROR`. El hash es el de la PROPIA consulta
  // (respeta un `queryKeyHashFn`), el mismo con que TanStack la nombra al
  // quitarla.
  const queryHash = isDefinitiveError ? queryClient.defaultQueryOptions(options).queryHash : "";
  const rememberedAt = useSyncExternalStore(
    subscribeToDefinitiveErrors,
    () => definitiveErrorAt.get(queryHash) ?? NO_DEFINITIVE_ERROR,
    () => NO_DEFINITIVE_ERROR,
  );

  const isCurrentErrorDefinitive =
    isDefinitiveError !== undefined && isError && isDefinitiveError(error);
  // Definitiva también si el error vigente es OTRO pero no ha habido una
  // respuesta exitosa desde el último definitivo.
  const isDefinitive =
    isCurrentErrorDefinitive || (isError && rememberedAt > dataUpdatedAt);

  useEffect(() => {
    if (queryHash === "") return;
    watchRemovedQueries(queryClient.getQueryCache());
    if (isCurrentErrorDefinitive) {
      setDefinitiveErrorAt(queryHash, errorUpdatedAt);
    } else if (!isError || dataUpdatedAt >= rememberedAt) {
      // Una respuesta exitosa posterior levanta la marca.
      setDefinitiveErrorAt(queryHash, undefined);
    }
  }, [
    queryClient,
    queryHash,
    isCurrentErrorDefinitive,
    isError,
    errorUpdatedAt,
    dataUpdatedAt,
    rememberedAt,
  ]);

  const guardedData = isDefinitive ? undefined : data;

  const { hasLoaded, isInitialError } = useHasLoadedQuery({
    data: isPlaceholderData ? undefined : guardedData,
    isError: isError && !isDefinitive,
    errorUpdatedAt,
    toastId,
    errorMessage,
  });

  return {
    data: guardedData,
    hasLoaded,
    isLoading,
    isFetching,
    isPlaceholderData,
    isInitialError,
    isDefinitiveError: isDefinitive,
    error: isInitialError ? error : null,
    refetch,
  };
};
