import { ComprasIcon, ClockIcon, CheckCircleIcon, ErrorIcon } from "@/src/components/Icons";
import KpiGrid, { KpiItem } from "@/src/components/KpiGrid";
import { MOCK_PURCHASE_ORDERS } from "../mocks/purchase-orders.mock";

// KPIs derivados del mock de datos
const total = MOCK_PURCHASE_ORDERS.length;
const pendientes = MOCK_PURCHASE_ORDERS.filter((o) => o.estatus === 2).length;
const autorizadas = MOCK_PURCHASE_ORDERS.filter((o) =>
  [3, 4].includes(o.estatus),
).length;
const canceladas = MOCK_PURCHASE_ORDERS.filter((o) => o.estatus === 5).length;

export const PurchaseOrderStats = () => {
  const items: KpiItem[] = [
    {
      label: "Total Órdenes",
      value: String(total),
      icon: ComprasIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      trendLabel: "Activas",
      status: "neutral",
    },
    {
      label: "Pendientes",
      value: String(pendientes),
      icon: ClockIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-500",
      trendLabel: "Por autorizar",
      status: "neutral",
    },
    {
      label: "Autorizadas",
      value: String(autorizadas),
      icon: CheckCircleIcon,
      iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass: "text-emerald-500",
      trendLabel: "Completadas o en curso",
      status: "positive",
    },
    {
      label: "Canceladas",
      value: String(canceladas),
      icon: ErrorIcon,
      iconBgClass: "bg-red-50 dark:bg-red-500/10",
      iconClass: "text-red-500",
      trendLabel: "Este período",
      status: "negative",
    },
  ];

  return <KpiGrid items={items} />;
};
