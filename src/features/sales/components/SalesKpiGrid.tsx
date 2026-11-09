"use client";

import KpiGrid, { KPI_MUTED_ICON, type KpiCompactItem } from "@/src/components/KpiGrid";
import {
  ClientesIcon,
  TrendingUpIcon,
} from "@/src/components/Icons";
import { useCustomerKpis } from "@/src/features/customers/hooks/useCustomerKpis";
import type {
  CustomerActiveKpiAvailable,
  CustomerKpis,
  CustomerKpiUnavailable,
  CustomerNewKpi,
  CustomerNewKpiAvailable,
} from "@/src/features/customers/interfaces/customer-kpis.interface";
import { useRecentQuoteKpis } from "@/src/features/quotes/hooks/useQuoteKpiSummary";
import { buildRecentQuotesCard } from "@/src/features/quotes/components/QuoteKpiCards";
import { formatCalendarMonth } from "@/src/utils/formatDate";

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

/**
 * Tarjeta de un bloque de `clientes/kpis/`. Los estados comunes viven aquí:
 * "—" mientras carga, "No disponible" si la consulta nunca cargó, si el bloque
 * llega con `disponible: false` (su `motivo` va al ⓘ) o si no llega (un backend
 * sin ese bloque no tira la página); `build` solo pinta el bloque disponible.
 */
function customerKpiCard<T extends { disponible: true }>(
  base: Pick<KpiCompactItem, "label" | "icon">,
  data: CustomerKpis | undefined,
  isInitialError: boolean,
  pick: (data: CustomerKpis) => T | CustomerKpiUnavailable | undefined,
  build: (kpi: T) => Omit<KpiCompactItem, "label" | "icon">,
): KpiCompactItem {
  const unavailable = (reason: string): KpiCompactItem => ({ ...base, ...KPI_MUTED_ICON, value: null, unavailableReason: reason });
  if (isInitialError) return unavailable("No se pudieron cargar los indicadores de clientes.");
  if (!data) return { ...base, ...KPI_MUTED_ICON, value: "—", hideProgress: true };
  const kpi = pick(data);
  if (!kpi) return unavailable("El servidor no envió este indicador.");
  if (!kpi.disponible) return unavailable(kpi.motivo);
  return { ...base, ...build(kpi) };
}

/** Clientes activos del backend. */
function activeCustomersCard(data: CustomerKpis | undefined, isInitialError: boolean): KpiCompactItem {
  return customerKpiCard(
    { label: "Clientes Activos", icon: ClientesIcon },
    data,
    isInitialError,
    (kpis) => kpis.clientes_activos,
    (kpi: CustomerActiveKpiAvailable) => ({
      ...(kpi.activos > 0 ? { iconClass: "text-sky-500" } : KPI_MUTED_ICON),
      value: kpi.activos.toLocaleString("es-MX"),
      detail: `Últimos ${kpi.ventana_dias} días · de ${kpi.total.toLocaleString("es-MX")}`,
      info: kpi.criterio,
      hideProgress: true,
    }),
  );
}

/**
 * Clientes nuevos del mes. El rótulo sale del `mes` del backend: el mes no se
 * recalcula aquí.
 */
function newCustomersCard(data: CustomerKpis | undefined, isInitialError: boolean): KpiCompactItem {
  return customerKpiCard(
    { label: "Nuevos este mes", icon: TrendingUpIcon },
    data,
    isInitialError,
    // Opcional a propósito: contra un backend sin EC-817 el bloque no viene.
    (kpis): CustomerNewKpi | undefined => kpis.clientes_nuevos,
    (kpi: CustomerNewKpiAvailable) => ({
      ...(kpi.total > 0 ? { iconClass: "text-emerald-500" } : KPI_MUTED_ICON),
      value: kpi.total.toLocaleString("es-MX"),
      detail: formatCalendarMonth(kpi.mes) ?? "Clientes nuevos",
      info: kpi.criterio,
      hideProgress: true,
    }),
  );
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
