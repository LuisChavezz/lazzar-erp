"use client";

import { useMemo } from "react";
import KpiGrid, { KpiItem } from "@/src/components/KpiGrid";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { PedidosIcon, RejectIcon } from "@/src/components/Icons";
import { useOperationsQuotes } from "../hooks/useOperationsQuotes";

export const OperationsQuoteStats = () => {
  const { operationsQuotes, isLoading } = useOperationsQuotes();

  const pendingApprovalCount = useMemo(
    () =>
      operationsQuotes.filter((operationsQuote) => operationsQuote.estatus === 2)
        .length,
    [operationsQuotes]
  );
  const rejectedCount = useMemo(
    () =>
      operationsQuotes.filter((operationsQuote) => operationsQuote.estatus === 4)
        .length,
    [operationsQuotes]
  );
  const rejectedRatio = useMemo(() => {
    if (operationsQuotes.length === 0) {
      return 0;
    }

    return Math.round((rejectedCount / operationsQuotes.length) * 100);
  }, [operationsQuotes.length, rejectedCount]);

  const items: KpiItem[] = [
    {
      label: "Por Autorizar",
      value: pendingApprovalCount.toLocaleString("es-MX"),
      icon: PedidosIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-500",
      subLabel: "Pedidos pendientes de autorización",
      status: "neutral",
      progress: Math.min(100, pendingApprovalCount * 5),
      actionLabel: "Ver pedidos",
      actionHref: "/operations/quotes",
    },
    {
      label: "Rechazadas",
      value: rejectedCount.toLocaleString("es-MX"),
      icon: RejectIcon,
      iconBgClass: "bg-rose-50 dark:bg-rose-500/10",
      iconClass: "text-rose-500",
      subLabel: `${rejectedRatio}% del total de pedidos`,
      status: rejectedCount > 0 ? "negative" : "neutral",
      progress: rejectedRatio,
    },
  ];

  if (isLoading) {
    return (
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        role="status"
        aria-live="polite"
        aria-label="Cargando estadísticas operativas de pedidos"
      >
        <LoadingSkeleton className="h-32 rounded-xl" />
        <LoadingSkeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return <KpiGrid items={items} />;
};