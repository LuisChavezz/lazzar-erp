import type { KpiItem } from "@/src/components/KpiGrid";
import {
  CheckCircleIcon,
  CxcIcon,
  PedidosIcon,
  TrendingUpIcon,
} from "@/src/components/Icons";
import type { Customer } from "../interfaces/customer.interface";

// Normaliza texto para ids amigables en URL.
export const toCustomerSlug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const getSelectedCustomer = (
  customers: Customer[],
  requestedId: string
): Customer | null => {
  return customers.find((item) => item.id === requestedId) ?? null;
};

// Genera los KPIs de la cabecera del detalle.
export const buildCustomerKpis = (): KpiItem[] => [
  {
    label: "LTV Total",
    value: "$45,200",
    icon: CxcIcon,
    iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
    iconClass: "text-emerald-500",
    trendLabel: "+6.3%",
    status: "positive",
    subLabel: "Acumulado",
    progress: 72,
  },
  {
    label: "Pedidos",
    value: "12 Completados",
    icon: PedidosIcon,
    iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
    iconClass: "text-sky-500",
    status: "positive",
    subLabel: "Último pedido",
    progress: 80,
  },
  {
    label: "Oportunidades",
    value: "2 Activas",
    icon: TrendingUpIcon,
    iconBgClass: "bg-fuchsia-50 dark:bg-fuchsia-500/10",
    iconClass: "text-fuchsia-500",
    status: "neutral",
    subLabel: "Pipeline comercial",
    progress: 50,
  },
  {
    label: "NPS Score",
    value: "9/10",
    icon: CheckCircleIcon,
    iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
    iconClass: "text-amber-500",
    trendLabel: "+1",
    status: "positive",
    subLabel: "Satisfacción",
    progress: 90,
  },
];
