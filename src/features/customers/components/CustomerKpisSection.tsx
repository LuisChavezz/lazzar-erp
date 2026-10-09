"use client";

import { useState, type ReactNode } from "react";
import KpiGrid, {
  buildUntypedKpiCard,
  KPI_MUTED_ICON,
  KpiGridSkeleton,
  type KpiCompactItem,
} from "@/src/components/KpiGrid";
import { KpiDrillDownButton } from "@/src/components/KpiDrillDownButton";
import { SectionErrorNotice } from "@/src/components/SectionErrorNotice";
import { ClientesIcon, ReceiptIcon, TrendingUpIcon, WalletIcon } from "@/src/components/Icons";
import { useCustomerKpis } from "../hooks/useCustomerKpis";
import { formatKpiMonto, formatKpiPct, plural } from "@/src/utils/kpiFormat";
import type {
  CustomerActiveKpi,
  CustomerCarteraKpi,
  CustomerKpis,
  CustomerSalesKpi,
} from "../interfaces/customer-kpis.interface";
import {
  CustomerKpiDrillDownDialog,
  type CustomerKpiDrillDownKind,
} from "./CustomerKpiDrillDownDialog";

const SECTION_TITLE = "Indicadores";

/**
 * Ventas por cliente: total facturado, con la concentración del top. Sin meta
 * ni semáforo (el backend no los expone): sin insignia y sin barra.
 */
function salesCard(kpi: CustomerSalesKpi, onDrillDown: () => void): KpiCompactItem {
  const base = { label: "Ventas por cliente", icon: TrendingUpIcon };
  if (!kpi.disponible) {
    return { ...base, ...KPI_MUTED_ICON, value: null, unavailableReason: kpi.motivo };
  }
  const facturados = `${kpi.total_clientes_facturados} ${plural(kpi.total_clientes_facturados, "cliente facturado", "clientes facturados")}`;
  // N real del top (hasta 5): su `pct_acumulado` es la concentración.
  const last = kpi.top_clientes.at(-1);
  const detail = last
    ? `${facturados} · Top ${kpi.top_clientes.length}: ${formatKpiPct(last.pct_acumulado)}`
    : facturados;
  return {
    ...base,
    ...(kpi.total_facturado > 0 ? { iconClass: "text-sky-500" } : KPI_MUTED_ICON),
    value: formatKpiMonto(kpi.total_facturado),
    info: "Total facturado a los clientes que puedes ver; el detalle muestra los que más concentran la facturación. Los importes suman monedas sin distinguirlas.",
    hideProgress: true,
    detail,
    action: (
      <KpiDrillDownButton
        label="Ver top"
        ariaLabel="Ver clientes con más facturación"
        isEmpty={kpi.top_clientes.length === 0}
        onClick={onDrillDown}
      />
    ),
  };
}

/**
 * Clientes activos vs. inactivos. Sin drill-down: el backend no dice cuáles
 * son. `pct_activos` llega `null` sin clientes: entonces no se pinta porcentaje.
 */
function activeCard(kpi: CustomerActiveKpi): KpiCompactItem {
  const base = { label: "Clientes activos vs. inactivos", icon: ClientesIcon };
  if (!kpi.disponible) {
    return { ...base, ...KPI_MUTED_ICON, value: null, unavailableReason: kpi.motivo };
  }
  const split = `de ${kpi.total} · ${kpi.inactivos} ${plural(kpi.inactivos, "inactivo", "inactivos")}`;
  return {
    ...base,
    ...(kpi.activos > 0 ? { iconClass: "text-emerald-500" } : KPI_MUTED_ICON),
    value: String(kpi.activos),
    info: `Un cliente está activo si tiene algún pedido en los últimos ${kpi.ventana_dias} días.`,
    hideProgress: true,
    detail: kpi.pct_activos === null ? split : `${formatKpiPct(kpi.pct_activos)} ${split}`,
  };
}

/**
 * Saldo vencido por antigüedad: conteo por tramo a la vista y monto por tramo
 * en el ⓘ (los tres montos no caben en la línea de la tarjeta).
 */
function carteraCard(kpi: CustomerCarteraKpi, onDrillDown: () => void): KpiCompactItem {
  const base = { label: "Saldo y antigüedad de cartera", icon: WalletIcon };
  if (!kpi.disponible) {
    return { ...base, ...KPI_MUTED_ICON, value: null, unavailableReason: kpi.motivo };
  }
  const { buckets } = kpi;
  const counts = `1–30: ${buckets["0_30"].total} · 31–60: ${buckets["31_60"].total} · 61+: ${buckets["60_mas"].total}`;
  return {
    ...base,
    ...(kpi.total_cuentas_vencidas > 0 ? { iconClass: "text-red-500" } : KPI_MUTED_ICON),
    value: formatKpiMonto(kpi.saldo_total_vencido),
    info:
      `Saldo vencido por días de atraso — 1 a 30: ${formatKpiMonto(buckets["0_30"].monto)} · ` +
      `31 a 60: ${formatKpiMonto(buckets["31_60"].monto)} · 61 o más: ${formatKpiMonto(buckets["60_mas"].monto)}. ` +
      "Los importes suman monedas sin distinguirlas.",
    hideProgress: true,
    detail: counts,
    detailTitle: `Cuentas vencidas por días de atraso — ${counts}`,
    action: (
      <KpiDrillDownButton
        label="Ver cuentas"
        ariaLabel="Ver cuentas por cobrar vencidas"
        isEmpty={kpi.drill_down.length === 0}
        onClick={onDrillDown}
      />
    ),
  };
}

function buildCards(
  data: CustomerKpis,
  openDrillDown: (kind: CustomerKpiDrillDownKind) => void,
): KpiCompactItem[] {
  return [
    salesCard(data.ventas_por_cliente, () => openDrillDown("ventas_por_cliente")),
    activeCard(data.clientes_activos),
    // Hoy siempre llega no disponible (ver `buildUntypedKpiCard`).
    buildUntypedKpiCard(data.reclamos_devoluciones, { label: "Tasa de reclamos o devoluciones", icon: ReceiptIcon }),
    carteraCard(data.cartera_antiguedad, () => openDrillDown("cartera_antiguedad")),
  ];
}

/**
 * Indicadores de clientes (`GET /terceros/clientes/kpis/`): ventas por cliente,
 * activos vs. inactivos, reclamos y devoluciones, y cartera vencida, en ese
 * orden. Todo es el valor del backend; aquí no se calcula ningún indicador.
 * Cada bloque decide solo por su `disponible`.
 *
 * Tiene su propia consulta: carga y falla dentro de la sección sin tocar la
 * lista de clientes. Sin gate de permiso: la ruta ya exige `R-CRM-CLIENTES`
 * (`routePermissions`). Mismo patrón que `PedidoKpisSection`.
 */
export function CustomerKpisSection() {
  const { data, isInitialError, isFetching, refetch } = useCustomerKpis();
  // `drillDownKind` es el ÚLTIMO drill-down abierto y no se limpia al cerrar:
  // así el diálogo conserva título y filas durante su animación de salida.
  const [drillDownKind, setDrillDownKind] = useState<CustomerKpiDrillDownKind | null>(null);
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);
  const openDrillDown = (kind: CustomerKpiDrillDownKind) => {
    setDrillDownKind(kind);
    setIsDrillDownOpen(true);
  };

  let body: ReactNode;
  if (data) {
    body = <KpiGrid compact items={buildCards(data, openDrillDown)} />;
  } else if (isInitialError) {
    body = (
      <SectionErrorNotice
        title="No se pudieron cargar los indicadores"
        message="Intenta de nuevo en unos momentos."
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    );
  } else {
    body = <KpiGridSkeleton compact count={4} />;
  }

  return (
    <section aria-label={SECTION_TITLE}>
      {body}
      <CustomerKpiDrillDownDialog
        open={isDrillDownOpen}
        kind={drillDownKind}
        data={data}
        onClose={() => setIsDrillDownOpen(false)}
      />
    </section>
  );
}
