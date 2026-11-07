"use client";

import KpiGrid, { KPI_MUTED_ICON, type KpiCompactItem } from "@/src/components/KpiGrid";
import {
  ClientesIcon,
  TrendingUpIcon,
  OrdenesIcon,
} from "@/src/components/Icons";
import { useCustomers } from "@/src/features/customers/hooks/useCustomers";
import { useQuoteKpiSummary } from "@/src/features/quotes/hooks/useQuoteKpiSummary";
import { buildRecentQuotesCard } from "@/src/features/quotes/components/QuoteKpiCards";

/**
 * Indicadores del dashboard de Ventas (`/sales`), en el diseño compacto de
 * `KpiGrid` (el de Pedidos, Mesa de Control, Compras y Clientes).
 *
 * "Cotizaciones · 30 días" es la MISMA tarjeta y la misma consulta que en
 * `/sales/quotes` (`useQuoteKpiSummary` → `kpis/` con `fecha_desde`/
 * `fecha_hasta`): reemplaza al "Pedidos del mes", que contaba cotizaciones de
 * la lista completa con un rótulo de pedidos. Las tarjetas de clientes y de
 * pedidos críticos no son de este cambio: conservan sus datos y textos.
 */
export const SalesKpiGrid = () => {
  const { customers, isLoading: isCustomersLoading } = useCustomers();
  const { recent } = useQuoteKpiSummary();

  const totalCustomers = customers.length;
  const customersValue = isCustomersLoading ? "—" : String(totalCustomers);

  const items: KpiCompactItem[] = [
    {
      label: "Clientes Activos",
      value: customersValue,
      icon: ClientesIcon,
      ...(totalCustomers > 0 ? { iconClass: "text-sky-500" } : KPI_MUTED_ICON),
      detail: "Últimos 30 días",
      hideProgress: true,
    },
    {
      label: "Nuevos este mes",
      value: customersValue,
      icon: TrendingUpIcon,
      ...(totalCustomers > 0 ? { iconClass: "text-emerald-500" } : KPI_MUTED_ICON),
      detail: "Clientes nuevos",
      hideProgress: true,
    },
    buildRecentQuotesCard({ data: recent.data, isInitialError: recent.isInitialError }),
    {
      label: "Pedidos críticos",
      value: isCustomersLoading ? "—" : "0",
      icon: OrdenesIcon,
      ...KPI_MUTED_ICON,
      detail: "Atención inmediata",
      hideProgress: true,
    },
  ];

  return <KpiGrid compact items={items} />;
};
