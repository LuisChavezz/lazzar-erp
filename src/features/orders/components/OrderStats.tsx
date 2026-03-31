"use client";

import { useMemo } from "react";
import KpiGrid, { KpiItem } from "@/src/components/KpiGrid";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { ClientesIcon, FacturacionIcon, OrdenesIcon, TrendingUpIcon } from "../../../components/Icons";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { useOrders } from "../hooks/useOrders";
import { useCustomers } from "../../customers/hooks/useCustomers";

export const OrderStats = () => {
  const { orders, isLoading } = useOrders();
  const { customers, isLoading: isCustomersLoading } = useCustomers();

  const totalCustomers = customers.length;

  const totalOrdersAmount = useMemo(
    () => orders.reduce((sum, order) => sum + (Number(order.gran_total) || 0), 0),
    [orders]
  );

  const pendingAuthorizationCount = useMemo(
    () => orders.filter((order) => order.estatus === 2).length,
    [orders]
  );

  const items: KpiItem[] = [
    {
      label: "Clientes Activos",
      value: String(totalCustomers),
      icon: ClientesIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      subLabel: "Últimos 30 días",
      status: "positive",
    },
    {
      label: "Nuevos este mes",
      value: String(totalCustomers),
      icon: TrendingUpIcon,
      iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass: "text-emerald-500",
      subLabel: "Clientes nuevos",
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

  if (isLoading || isCustomersLoading) {
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
