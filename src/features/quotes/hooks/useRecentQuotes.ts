"use client";

import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getQuotesPage } from "../services/actions";
import { RECENT_QUOTES_QUERY_KEY } from "../constants/quotesQueryKeys";

/** Cuántas muestra el dashboard de `/sales`. */
export const RECENT_QUOTES_LIMIT = 3;

/**
 * Las cotizaciones más recientes para el dashboard de `/sales`: UNA página de
 * `RECENT_QUOTES_LIMIT` filas del listado con su orden por defecto (más
 * reciente primero, `-id` de desempate), sin bajar la lista completa. Bajo
 * `["quotes"]`: las mutaciones de cotizaciones la refrescan.
 */
export const useRecentQuotes = () => {
  const { data, isLoading, isInitialError } = useGuardedQuery(
    {
      queryKey: RECENT_QUOTES_QUERY_KEY,
      queryFn: () => getQuotesPage({ limit: RECENT_QUOTES_LIMIT, offset: 0 }),
    },
    {
      toastId: "recent-quotes-refetch-error",
      errorMessage: "No se pudieron actualizar las cotizaciones recientes.",
    },
  );
  return { quotes: data?.results ?? [], isLoading, isInitialError };
};
