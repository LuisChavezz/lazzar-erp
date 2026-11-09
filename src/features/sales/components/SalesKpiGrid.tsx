"use client";

import KpiGrid, { KPI_MUTED_ICON, type KpiCompactItem } from "@/src/components/KpiGrid";
import {
  ClientesIcon,
  TrendingUpIcon,
} from "@/src/components/Icons";
import { useCustomerKpis } from "@/src/features/customers/hooks/useCustomerKpis";
import type { CustomerKpis } from "@/src/features/customers/interfaces/customer-kpis.interface";
import { useRecentQuoteKpis } from "@/src/features/quotes/hooks/useQuoteKpiSummary";
import { buildRecentQuotesCard } from "@/src/features/quotes/components/QuoteKpiCards";
import { getMonthLabel } from "@/src/utils/quincena";

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
 * "Nuevos este mes" es el `clientes_nuevos` de la misma respuesta (EC-828):
 * clientes activos dados de alta en el mes calendario que fija el backend, con
 * el mismo alcance que "Clientes activos". Antes mostraba el total de clientes
 * y bajaba la lista completa para contarlos. "Pedidos críticos" se quitó hasta
 * EC-818.
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

/**
 * "Noviembre 2026" a partir del `mes` del backend ("YYYY-MM"), sin pasar por
 * `Date`: el mes lo fija el backend en hora de México y no se recalcula aquí.
 * `null` si no tiene esa forma.
 */
function monthLabel(mes: string): string | null {
  const match = /^(\d{4})-(\d{2})$/.exec(mes);
  const name = match ? getMonthLabel(Number(match[2])) : "";
  return match && name ? `${name} ${match[1]}` : null;
}

/** Clientes nuevos del mes; mismos estados que `activeCustomersCard`. */
function newCustomersCard(data: CustomerKpis | undefined, isInitialError: boolean): KpiCompactItem {
  const base = { label: "Nuevos este mes", icon: TrendingUpIcon };
  if (isInitialError) {
    return { ...base, ...KPI_MUTED_ICON, value: null, unavailableReason: "No se pudieron cargar los indicadores de clientes." };
  }
  if (!data) return { ...base, ...KPI_MUTED_ICON, value: "—", hideProgress: true };
  const kpi = data.clientes_nuevos;
  if (!kpi.disponible) return { ...base, ...KPI_MUTED_ICON, value: null, unavailableReason: kpi.motivo };
  return {
    ...base,
    ...(kpi.total > 0 ? { iconClass: "text-emerald-500" } : KPI_MUTED_ICON),
    value: kpi.total.toLocaleString("es-MX"),
    detail: monthLabel(kpi.mes) ?? "Clientes nuevos",
    info: kpi.criterio,
    hideProgress: true,
  };
}

/** Indicadores del dashboard de Ventas; ver la nota de arriba. */
export const SalesKpiGrid = () => {
  const recent = useRecentQuoteKpis();
  const customerKpis = useCustomerKpis();

  const items: KpiCompactItem[] = [
    activeCustomersCard(customerKpis.data, customerKpis.isInitialError),
    newCustomersCard(customerKpis.data, customerKpis.isInitialError),
    buildRecentQuotesCard({ data: recent.data, isInitialError: recent.isInitialError }),
    // "Pedidos críticos" vuelve con EC-818: hoy `pedidos/kpis/` reporta
    // `pedidos_en_riesgo` como no disponible y la tarjeta mostraba un 0 fijo.
  ];

  return <KpiGrid compact items={items} />;
};
