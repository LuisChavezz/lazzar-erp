"use client";

import { useClientNow } from "@/src/hooks/useClientNow";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getQuoteKpis } from "../services/actions";
import { QUOTES_QUERY_KEY, quoteKpisQueryKey } from "../constants/quotesQueryKeys";
import { getRecentQuotesRange } from "../utils/quoteListParams";

const ALL_QUOTES_PARAMS: Readonly<Record<string, string>> = {};
const RECENT_PENDING_KEY = [...QUOTES_QUERY_KEY, "kpis", "sin-fecha"] as const;

const KPIS_REFETCH_ERROR = "No se pudieron actualizar los indicadores. Se muestran los datos anteriores.";

/**
 * `kpis/` de las cotizaciones creadas en los últimos 30 días con hoy incluido,
 * en el día LOCAL (`getRecentQuotesRange`). Lo leen `/sales` (SalesKpiGrid) y
 * `/sales/quotes` (QuoteStats) con la MISMA llave (`["quotes", "kpis",
 * params]`), así que la segunda pantalla sale de la caché. Espera a
 * `useClientNow` (null en el prerender y la hidratación: estas páginas son
 * estáticas) y cambia de llave a la medianoche. Un refetch fallido conserva
 * los datos y avisa por toast; `isInitialError` solo si nunca cargó.
 */
export const useRecentQuoteKpis = () => {
  const now = useClientNow();
  const recentParams = now === null ? null : getRecentQuotesRange(new Date(now));
  return useGuardedQuery(
    {
      // Sin fecha todavía, una llave propia: con `{}` compartiría la del total
      // y mostraría el histórico como si fuera el de 30 días.
      queryKey: recentParams ? quoteKpisQueryKey(recentParams) : RECENT_PENDING_KEY,
      queryFn: () => getQuoteKpis(recentParams ?? {}),
      enabled: recentParams !== null,
    },
    { toastId: "quote-kpis-recent-refetch-error", errorMessage: KPIS_REFETCH_ERROR },
  );
};

/**
 * Indicadores de `/sales/quotes` (QuoteStats): DOS lecturas de `kpis/` en
 * paralelo, ambas bajo `["quotes", "kpis", …]`, así que las mutaciones de
 * cotizaciones las refrescan.
 *
 * - `all`: sin filtros — total, por autorizar e importe por moneda. Solo aquí:
 *   `/sales` no lo muestra y no lo pide.
 * - `recent`: `useRecentQuoteKpis`, la misma consulta que usa `/sales`.
 */
export const useQuoteKpiSummary = () => {
  const all = useGuardedQuery(
    {
      queryKey: quoteKpisQueryKey(ALL_QUOTES_PARAMS),
      queryFn: () => getQuoteKpis({}),
    },
    { toastId: "quote-kpis-refetch-error", errorMessage: KPIS_REFETCH_ERROR },
  );
  const recent = useRecentQuoteKpis();
  return { all, recent };
};
