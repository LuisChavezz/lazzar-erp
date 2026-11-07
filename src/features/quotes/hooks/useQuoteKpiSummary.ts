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
 * Indicadores de cotizaciones para `/sales/quotes` (QuoteStats) y el dashboard
 * de `/sales` (SalesKpiGrid): DOS lecturas de `kpis/` en paralelo, bajo
 * `["quotes", "kpis", params]`, así que las dos pantallas comparten caché y las
 * mutaciones de cotizaciones las refrescan.
 *
 * - `all`: sin filtros — total, por autorizar e importe por moneda.
 * - `recent`: los últimos 30 días con hoy incluido, en el día LOCAL
 *   (`getRecentQuotesRange`). Espera a `useClientNow` (null en el prerender y
 *   la hidratación: estas páginas son estáticas) y cambia de llave a la
 *   medianoche.
 *
 * Cada una con su `isInitialError` (solo si nunca cargó); un refetch fallido
 * conserva los datos y avisa por toast, una vez por consulta.
 */
export const useQuoteKpiSummary = () => {
  const now = useClientNow();
  const recentParams = now === null ? null : getRecentQuotesRange(new Date(now));

  const all = useGuardedQuery(
    {
      queryKey: quoteKpisQueryKey(ALL_QUOTES_PARAMS),
      queryFn: () => getQuoteKpis({}),
    },
    { toastId: "quote-kpis-refetch-error", errorMessage: KPIS_REFETCH_ERROR },
  );

  const recent = useGuardedQuery(
    {
      // Sin fecha todavía, una llave propia: con `{}` compartiría la de `all`
      // y mostraría el total histórico como si fuera el de 30 días.
      queryKey: recentParams ? quoteKpisQueryKey(recentParams) : RECENT_PENDING_KEY,
      queryFn: () => getQuoteKpis(recentParams ?? {}),
      enabled: recentParams !== null,
    },
    { toastId: "quote-kpis-recent-refetch-error", errorMessage: KPIS_REFETCH_ERROR },
  );

  return { all, recent };
};
