"use client";

import { useMemo } from "react";
import KpiGrid, { KpiItem } from "@/src/components/KpiGrid";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import {
  PedidosIcon,
  CheckCircleIcon,
  TrendingUpIcon,
  ClockIcon,
} from "@/src/components/Icons";
import { useQuotes } from "@/src/features/quotes/hooks/useQuotes";
import { formatCurrency } from "@/src/utils/formatCurrency";

// ─── Componente ───────────────────────────────────────────────────────────────
export const OperationsKpiGrid = () => {
  const { quotes, isLoading } = useQuotes();

  const stats = useMemo(() => {
    const pending = quotes.filter((q) => q.estatus === 2).length;
    const approved = quotes.filter((q) => q.estatus === 3).length;
    const totalApprovedAmount = quotes
      .filter((q) => q.estatus === 3)
      .reduce((sum, q) => sum + (Number(q.gran_total) || 0), 0);
    return { total: quotes.length, pending, approved, totalApprovedAmount };
  }, [quotes]);

  const items: KpiItem[] = [
    {
      label: "Total Cotizaciones",
      value: String(stats.total),
      icon: PedidosIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      subLabel: "Registradas en el sistema",
      status: "neutral",
      progress: 100,
    },
    {
      label: "Por Autorizar",
      value: String(stats.pending),
      icon: ClockIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-500",
      subLabel: "Requieren atención",
      status: stats.pending > 0 ? "neutral" : "positive",
      progress: stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0,
      // actionLabel: "Revisar",
      // actionHref: "/operations/quotes",
    },
    {
      label: "Autorizadas",
      value: String(stats.approved),
      icon: CheckCircleIcon,
      iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass: "text-emerald-500",
      subLabel: "Pedidos confirmados",
      status: "positive",
      progress: stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0,
    },
    {
      label: "Importe Autorizado",
      value: formatCurrency(stats.totalApprovedAmount),
      icon: TrendingUpIcon,
      iconBgClass: "bg-violet-50 dark:bg-violet-500/10",
      iconClass: "text-violet-500",
      subLabel: "Total en cotizaciones auth.",
      status: "positive",
      progress: 100,
    },
  ];

  if (isLoading) {
    return (
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        role="status"
        aria-label="Cargando indicadores operativos"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <LoadingSkeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  return <KpiGrid items={items} />;
};
