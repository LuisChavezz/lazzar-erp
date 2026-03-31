"use client";

import KpiGrid, { KpiItem } from "@/src/components/KpiGrid";
import { ClientesIcon, TrendingUpIcon, CheckCircleIcon, ClockIcon } from "@/src/components/Icons";
import { useCustomers } from "../hooks/useCustomers";

export const CustomerStats = () => {
  const { customers, isLoading } = useCustomers();
  const totalCustomers = customers.length;

  const items: KpiItem[] = [
    {
      label: "Clientes Activos",
      value: isLoading ? "..." : String(totalCustomers),
      icon: ClientesIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      subLabel: "Últimos 30 días",
      status: "positive",
    },
    {
      label: "Nuevos este mes",
      value: isLoading ? "..." : String(totalCustomers),
      icon: TrendingUpIcon,
      iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass: "text-emerald-500",
      subLabel: "Clientes nuevos",
      status: "positive",
    },
    {
      label: "Retención",
      value: isLoading ? "..." : "0",
      icon: CheckCircleIcon,
      iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass: "text-emerald-500",
      status: "positive",
    },
    {
      label: "Seguimientos Hoy",
      value: isLoading ? "..." : "0",
      icon: ClockIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-500",
      status: "neutral",
    },
  ];

  return <KpiGrid items={items} />;
};
