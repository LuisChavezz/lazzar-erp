import { ComprasIcon, ClockIcon, CheckCircleIcon, ErrorIcon } from "@/src/components/Icons";
import KpiGrid, { KpiItem } from "@/src/components/KpiGrid";

export const PurchaseOrderStats = () => {
  const items: KpiItem[] = [
    {
      label: "Total Órdenes",
      value: "—",
      icon: ComprasIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      trendLabel: "Activas",
      status: "neutral",
    },
    {
      label: "Pendientes",
      value: "—",
      icon: ClockIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-500",
      trendLabel: "Por autorizar",
      status: "neutral",
    },
    {
      label: "Autorizadas",
      value: "—",
      icon: CheckCircleIcon,
      iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass: "text-emerald-500",
      trendLabel: "Este mes",
      status: "positive",
    },
    {
      label: "Canceladas",
      value: "—",
      icon: ErrorIcon,
      iconBgClass: "bg-red-50 dark:bg-red-500/10",
      iconClass: "text-red-500",
      trendLabel: "Este mes",
      status: "negative",
    },
  ];

  return <KpiGrid items={items} />;
};
