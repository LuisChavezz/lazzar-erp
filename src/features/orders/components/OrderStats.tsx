"use client";

import { useMemo } from "react";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { TrendDirectionalIcon } from "../../../components/Icons";
import { useOrderStore } from "../stores/order.store";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { getOrdersDashboardMetrics } from "../utils/orderMetrics";

export const OrderStats = () => {
  const orders = useOrderStore((state) => state.orders);
  const hasHydrated = useOrderStore((state) => state.hasHydrated);

  const stats = useMemo(() => getOrdersDashboardMetrics(orders), [orders]);

  const formatVariationLabel = (value: number) => {
    if (value === 0) return "0% vs mes anterior";
    const sign = value > 0 ? "+" : "-";
    return `${sign}${Math.abs(value).toFixed(1)}% vs mes anterior`;
  };

  const getVariationClassName = (value: number) => {
    if (value > 0) return "text-emerald-600 dark:text-emerald-400";
    if (value < 0) return "text-red-600 dark:text-red-400";
    return "text-sky-600 dark:text-sky-300";
  };

  const pendingFooterClassName =
    stats.pendingOrdersCount > 10
      ? "text-red-500 dark:text-red-400"
      : stats.pendingOrdersCount > 0
        ? "text-amber-500 dark:text-amber-300"
        : "text-sky-600 dark:text-sky-300";

  const cardClassName =
    "rounded-xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70 dark:border-sky-500/20 dark:bg-black dark:shadow-lg dark:shadow-slate-950/40";
  const titleClassName = "text-slate-500 dark:text-sky-200/90 text-xs font-medium";
  const valueClassName =
    "mt-3 text-2xl font-bold leading-tight text-slate-900 dark:text-white font-mono break-words";

  if (!hasHydrated) {
    return (
      <div
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
        role="status"
        aria-live="polite"
        aria-label="Cargando estadísticas de pedidos"
      >
        <LoadingSkeleton className="h-32 rounded-3xl" />
        <LoadingSkeleton className="h-32 rounded-3xl" />
        <LoadingSkeleton className="h-32 rounded-3xl" />
        <LoadingSkeleton className="h-32 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      <div className={cardClassName}>
        <p className={titleClassName}>Ingresos (Mes)</p>
        <h3 className={valueClassName}>
          {formatCurrency(stats.monthRevenue)}
        </h3>
        <p className={`mt-3 text-xs font-semibold flex items-center gap-1 ${getVariationClassName(stats.monthRevenueVariation)}`}>
          <TrendDirectionalIcon
            className="w-3.5 h-3.5"
            direction={stats.monthRevenueVariation < 0 ? "down" : "up"}
          />
          {formatVariationLabel(stats.monthRevenueVariation)}
        </p>
      </div>

      <div className={cardClassName}>
        <p className={titleClassName}>Por Facturar</p>
        <h3 className={valueClassName}>
          {formatCurrency(stats.pendingAmount)}
        </h3>
        <p className={`mt-3 text-xs font-semibold ${pendingFooterClassName}`}>
          {stats.pendingOrdersCount.toLocaleString("es-MX")} pedidos pendientes
        </p>
      </div>

      <div className={cardClassName}>
        <p className={titleClassName}>Ticket Promedio</p>
        <h3 className={valueClassName}>
          {formatCurrency(stats.averageTicket)}
        </h3>
        <p className={`mt-3 text-xs font-semibold flex items-center gap-1 ${getVariationClassName(stats.averageTicketVariation)}`}>
          <TrendDirectionalIcon
            className="w-3.5 h-3.5"
            direction={stats.averageTicketVariation < 0 ? "down" : "up"}
          />
          {formatVariationLabel(stats.averageTicketVariation)}
        </p>
      </div>

      <div className={cardClassName}>
        <p className={titleClassName}>Total Pedidos</p>
        <h3 className={valueClassName}>
          {stats.monthOrdersCount.toLocaleString("es-MX")}
        </h3>
        <p className="mt-3 text-xs font-semibold text-sky-600 dark:text-sky-300">En lo que va del mes</p>
      </div>
    </div>
  );
};
