"use client";

import { useMemo } from "react";
import KpiGrid, { KpiItem, KpiStatus } from "@/src/components/KpiGrid";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { CxcIcon, FacturacionIcon, OrdenesIcon, TrendingUpIcon } from "../../../components/Icons";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { getOrdersDashboardMetrics } from "../utils/orderMetrics";
import { useOrders } from "../hooks/useOrders";

export const OrderStats = () => {
  const { orders, isLoading } = useOrders();

  const stats = useMemo(() => getOrdersDashboardMetrics(orders), [orders]);

  const formatVariationLabel = (value: number) => {
    if (value === 0) return "0%";
    const sign = value > 0 ? "+" : "-";
    return `${sign}${Math.abs(value).toFixed(1)}%`;
  };

  const getStatus = (value: number): KpiStatus => {
    if (value > 0) return "positive";
    if (value < 0) return "negative";
    return "neutral";
  };

  const revenueStatus = getStatus(stats.monthRevenueVariation);
  const ticketStatus = getStatus(stats.averageTicketVariation);

  const items: KpiItem[] = [
    {
      label: "Ingresos (Mes)",
      value: formatCurrency(stats.monthRevenue),
      icon: TrendingUpIcon,
      iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass: "text-emerald-500",
      trendLabel: formatVariationLabel(stats.monthRevenueVariation),
      status: revenueStatus,
    },
    {
      label: "Por Facturar",
      value: formatCurrency(stats.pendingAmount),
      icon: FacturacionIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-500",
      subLabel: `${stats.pendingOrdersCount.toLocaleString("es-MX")} pedidos pendientes`,
    },
    {
      label: "Ticket Promedio",
      value: formatCurrency(stats.averageTicket),
      icon: CxcIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      trendLabel: formatVariationLabel(stats.averageTicketVariation),
      status: ticketStatus,
    },
    {
      label: "Total Pedidos",
      value: stats.monthOrdersCount.toLocaleString("es-MX"),
      icon: OrdenesIcon,
      iconBgClass: "bg-slate-100 dark:bg-slate-800",
      iconClass: "text-slate-500 dark:text-slate-300",
      subLabel: "En lo que va del mes",
    },
  ];

  if (isLoading) {
    return (
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        role="status"
        aria-live="polite"
        aria-label="Cargando estadísticas de pedidos"
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
