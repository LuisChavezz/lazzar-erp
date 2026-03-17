import type { KpiItem } from "@/src/components/KpiGrid";
import {
  CheckCircleIcon,
  CxcIcon,
  PedidosIcon,
  TrendingUpIcon,
} from "@/src/components/Icons";
import type { Customer, CustomerItem } from "../interfaces/customer.interface";

// Normaliza texto para ids amigables en URL.
export const toCustomerSlug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// Crea un id único y legible combinando slug + sufijo aleatorio corto.
export const createCustomerId = (name: string) => {
  const prefix = toCustomerSlug(name) || "cliente";
  const suffix = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID().slice(0, 8)
    : `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
  return `${prefix}-${suffix}`;
};

// Adapta el modelo de store al modelo de detalle.
export const mapCustomerItemToCustomer = (
  item: CustomerItem,
  index: number
): Customer => ({
  id: item.id || toCustomerSlug(item.razonSocial) || `customer-${index + 1}`,
  nombre: item.contacto,
  razonSocial: item.razonSocial,
  telefono: item.telefono,
  correo: item.correo,
  ultimaCompra: item.ultimaCompra,
  ultimoPedido: item.ultimoPedido,
  vendedor: item.vendedor,
  orderProfile: item.orderProfile,
});

// Busca cliente por id exacto para la ruta /customers/[id].
export const getSelectedCustomer = (
  customers: CustomerItem[],
  requestedId: string
): Customer | null => {
  if (customers.length === 0) return null;

  const mappedCustomers = customers.map(mapCustomerItemToCustomer);

  return mappedCustomers.find((item) => item.id === requestedId) ?? null;
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
