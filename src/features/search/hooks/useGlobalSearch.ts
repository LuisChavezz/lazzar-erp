"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/src/hooks/useDebounce";
import { getGlobalSearch } from "../services/actions";
import {
  SEARCH_DEBOUNCE_MS,
  SEARCH_MIN_QUERY_LENGTH,
  SEARCH_RESULTS_PER_GROUP,
} from "../constants/globalSearch";
import type { GlobalSearchResponse } from "../interfaces/global-search.interface";

/**
 * Búsqueda global en vivo (`GET /search/`).
 *
 * Mismo patrón que el buscador del onboarding de etiquetas RFID: el texto se
 * debouncea aquí dentro (el consumidor pasa el valor crudo del input),
 * `keepPreviousData` conserva los resultados anteriores mientras llega la
 * siguiente respuesta —así la lista no parpadea al teclear— y la llave incluye
 * todo lo que cambia la respuesta.
 *
 * Por debajo de `SEARCH_MIN_QUERY_LENGTH` la consulta queda APAGADA: el backend
 * respondería 200 con los grupos vacíos, así que pedírselo sería una petición
 * por cada una de las primeras letras sin ninguna información a cambio.
 *
 * Aviso para el consumidor: con `keepPreviousData` los datos de la búsqueda
 * anterior siguen disponibles aunque la consulta esté apagada. Hay que ramificar
 * por `isQueryEnabled` ANTES de pintar resultados, o al borrar el texto se
 * verían los de la búsqueda previa.
 */
export const useGlobalSearch = (query: string) => {
  const trimmedQuery = query.trim();
  const debouncedQuery = useDebounce(trimmedQuery, SEARCH_DEBOUNCE_MS);

  // Se exige el mínimo al texto CRUDO y al debounced. Solo con el debounced,
  // durante los 350 ms siguientes a borrar el campo —o a reabrir la paleta, que
  // lo vacía— el valor diferido seguiría siendo la búsqueda anterior y se
  // pintarían sus resultados sobre un input vacío. Con las dos condiciones, la
  // UI vuelve a la pista de longitud mínima en cuanto el usuario borra.
  const isQueryEnabled =
    trimmedQuery.length >= SEARCH_MIN_QUERY_LENGTH &&
    debouncedQuery.length >= SEARCH_MIN_QUERY_LENGTH;

  const result = useQuery<GlobalSearchResponse>({
    queryKey: ["global-search", debouncedQuery, SEARCH_RESULTS_PER_GROUP],
    queryFn: () =>
      getGlobalSearch({ q: debouncedQuery, limit: SEARCH_RESULTS_PER_GROUP }),
    enabled: isQueryEnabled,
    placeholderData: keepPreviousData,
    // Una búsqueda es una foto del momento: hereda por defecto los 15 min de
    // `staleTime` del QueryClient, y con eso repetir un término dentro de esa
    // ventana devolvería la respuesta cacheada sin volver a preguntar —un
    // registro creado entre medias parecería no existir—. Con `staleTime: 0` la
    // caché sigue sirviendo para pintar al instante (con `keepPreviousData`) y
    // el refetch en segundo plano trae lo de ahora. `gcTime` corto porque estos
    // resultados no se reutilizan una vez cerrada la paleta.
    staleTime: 0,
    gcTime: 60_000,
  });

  return {
    data: result.data,
    /** Grupos tal como llegaron. Longitud VARIABLE: nunca se asume un fijo. */
    groups: result.data?.grupos ?? [],
    debouncedQuery,
    isQueryEnabled,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
    error: result.error,
  };
};
