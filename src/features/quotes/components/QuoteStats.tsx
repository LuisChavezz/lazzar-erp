"use client";

import KpiGrid, { KpiGridSkeleton } from "@/src/components/KpiGrid";
import { KpiSectionErrorBoundary } from "@/src/components/KpiSectionErrorBoundary";
import { QUOTES_QUERY_KEY } from "../constants/quotesQueryKeys";
import { useQuoteKpiSummary } from "../hooks/useQuoteKpiSummary";
import {
  buildPendingAuthorizationCard,
  buildQuoteAmountCard,
  buildQuoteTotalCard,
  buildRecentQuotesCard,
} from "./QuoteKpiCards";

function QuoteStatsContent() {
  const { all, recent } = useQuoteKpiSummary();
  // Hasta la primera respuesta del total, el skeleton de la grilla compacta
  // (mismo alto, sin salto); después cada tarjeta resuelve su propio estado.
  if (!all.data && !all.isInitialError) {
    return <KpiGridSkeleton compact count={4} label="Cargando indicadores de cotizaciones" />;
  }
  const allSource = { data: all.data, isInitialError: all.isInitialError };
  return (
    <KpiGrid
      compact
      items={[
        buildQuoteTotalCard(allSource),
        buildPendingAuthorizationCard(allSource),
        buildQuoteAmountCard(allSource),
        buildRecentQuotesCard({ data: recent.data, isInitialError: recent.isInitialError }),
      ]}
    />
  );
}

/**
 * Indicadores de cotizaciones de `/sales/quotes`, del backend (`kpis/`, dos
 * lecturas en paralelo: todo y los últimos 30 días): total, por autorizar,
 * importe por moneda sin las rechazadas y cotizaciones de 30 días. Aquí no se
 * cuenta nada sobre filas cargadas: el listado solo tiene una página.
 *
 * Cada tarjeta carga y falla por su cuenta ("—" / "No disponible"), y la
 * sección tiene su propio límite de error: si el payload cambia de forma y el
 * render lanza, se pinta un aviso aquí y el listado sigue usable.
 */
export const QuoteStats = () => (
  <KpiSectionErrorBoundary
    queryKey={[...QUOTES_QUERY_KEY, "kpis"]}
    message="Ocurrió un error al mostrar los indicadores. El listado de cotizaciones sigue disponible."
  >
    <QuoteStatsContent />
  </KpiSectionErrorBoundary>
);
