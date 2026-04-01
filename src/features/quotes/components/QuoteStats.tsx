"use client";

import { useMemo } from "react";
import KpiGrid, { KpiItem } from "@/src/components/KpiGrid";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { FacturacionIcon, OrdenesIcon, TrendingUpIcon } from "../../../components/Icons";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { useQuotes } from "../hooks/useQuotes";

export const QuoteStats = () => {
  const { quotes, isLoading } = useQuotes();

  const totalOrdersAmount = useMemo(
    () => quotes.reduce((sum, quote) => sum + (Number(quote.gran_total) || 0), 0),
    [quotes]
  );

  const pendingAuthorizationCount = useMemo(
    () => quotes.filter((quote) => quote.estatus === 2).length,
    [quotes]
  );

  const items: KpiItem[] = [
    {
      label: "Cotizaciones",
      value: String(quotes.length),
      icon: OrdenesIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      subLabel: "Últimos 30 días",
      status: "positive",
    },
    {
      label: "Nuevos este mes",
      value: String(quotes.length),
      icon: TrendingUpIcon,
      iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass: "text-emerald-500",
      subLabel: "Cotizaciones nuevos",
      status: "positive",
    },
    {
      label: "Total de cotizaciones",
      value: formatCurrency(totalOrdersAmount),
      icon: FacturacionIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-500",
      subLabel: "Suma de totales",
      status: "positive",
    },
    {
      label: "Por autorizar",
      value: pendingAuthorizationCount.toLocaleString("es-MX"),
      icon: OrdenesIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      subLabel: "Cotizaciones pendientes",
      status: "neutral",
    },
  ];

  if (isLoading) {
    return (
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        role="status"
        aria-live="polite"
        aria-label="Cargando estadísticas de cotizaciones"
      >
        <LoadingSkeleton className="h-32 rounded-xl" />
        <LoadingSkeleton className="h-32 rounded-xl" />
        <LoadingSkeleton className="h-32 rounded-xl" />
        <LoadingSkeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <KpiGrid items={items} />
    </div>
  );
};
