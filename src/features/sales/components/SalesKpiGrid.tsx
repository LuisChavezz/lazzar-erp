"use client";

import KpiGrid, { KPI_MUTED_ICON, type KpiCompactItem } from "@/src/components/KpiGrid";
import {
  ClientesIcon,
  TrendingUpIcon,
} from "@/src/components/Icons";
import { useCustomers } from "@/src/features/customers/hooks/useCustomers";
import { useCustomerKpis } from "@/src/features/customers/hooks/useCustomerKpis";
import type { CustomerKpis } from "@/src/features/customers/interfaces/customer-kpis.interface";
import { useRecentQuoteKpis } from "@/src/features/quotes/hooks/useQuoteKpiSummary";
import { buildRecentQuotesCard } from "@/src/features/quotes/components/QuoteKpiCards";

/**
 * Indicadores del dashboard de Ventas (`/sales`), en el diseño compacto de
 * `KpiGrid` (el de Pedidos, Mesa de Control, Compras y Clientes).
 *
 * "Cotizaciones · 30 días" es la MISMA tarjeta y la misma consulta que en
 * `/sales/quotes` (`useRecentQuoteKpis` → `kpis/` con `fecha_desde`/
 * `fecha_hasta`): reemplaza al "Pedidos del mes", que contaba cotizaciones de
 * la lista completa con un rótulo de pedidos.
 *
 * "Clientes activos" es el `clientes_activos` de `GET /terceros/clientes/kpis/`
 * (la consulta de los indicadores de Clientes, `useCustomerKpis`): clientes con
 * algún pedido vigente en la ventana del backend, cuyo largo viene en
 * `ventana_dias`. Antes mostraba el total de clientes con un rótulo de "Últimos
 * 30 días".
 *
 * "Nuevos este mes" sigue como estaba: ningún endpoint da hoy ese valor (el
 * listado de clientes no filtra por fecha de alta). "Pedidos críticos" se quitó
 * hasta EC-818.
 */

/** Clientes activos del backend; "—" mientras carga y "No disponible" si no llega. */
function activeCustomersCard(data: CustomerKpis | undefined, isInitialError: boolean): KpiCompactItem {
  const base = { label: "Clientes Activos", icon: ClientesIcon };
  if (isInitialError) {
    return { ...base, ...KPI_MUTED_ICON, value: null, unavailableReason: "No se pudieron cargar los indicadores de clientes." };
  }
  if (!data) return { ...base, ...KPI_MUTED_ICON, value: "—", hideProgress: true };
  const kpi = data.clientes_activos;
  if (!kpi.disponible) return { ...base, ...KPI_MUTED_ICON, value: null, unavailableReason: kpi.motivo };
  return {
    ...base,
    ...(kpi.activos > 0 ? { iconClass: "text-sky-500" } : KPI_MUTED_ICON),
    value: kpi.activos.toLocaleString("es-MX"),
    detail: `Últimos ${kpi.ventana_dias} días · de ${kpi.total.toLocaleString("es-MX")}`,
    info: kpi.criterio,
    hideProgress: true,
  };
}

/** Indicadores del dashboard de Ventas; ver la nota de arriba. */
export const SalesKpiGrid = () => {
  const { customers, isLoading: isCustomersLoading } = useCustomers();
  const recent = useRecentQuoteKpis();
  const customerKpis = useCustomerKpis();

  const totalCustomers = customers.length;
  const customersValue = isCustomersLoading ? "—" : String(totalCustomers);

  const items: KpiCompactItem[] = [
    activeCustomersCard(customerKpis.data, customerKpis.isInitialError),
    {
      label: "Nuevos este mes",
      value: customersValue,
      icon: TrendingUpIcon,
      ...(totalCustomers > 0 ? { iconClass: "text-emerald-500" } : KPI_MUTED_ICON),
      detail: "Clientes nuevos",
      hideProgress: true,
    },
    buildRecentQuotesCard({ data: recent.data, isInitialError: recent.isInitialError }),
    // "Pedidos críticos" vuelve con EC-818: hoy `pedidos/kpis/` reporta
    // `pedidos_en_riesgo` como no disponible y la tarjeta mostraba un 0 fijo.
  ];

  return <KpiGrid compact items={items} />;
};
