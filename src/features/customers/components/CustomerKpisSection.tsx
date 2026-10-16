"use client";

import { useState, type ReactNode } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import KpiGrid, {
  buildUntypedKpiCard,
  KPI_MUTED_ICON,
  KpiGridSkeleton,
  type KpiCompactItem,
} from "@/src/components/KpiGrid";
import { KpiDrillDownButton } from "@/src/components/KpiDrillDownButton";
import { KpiCurrencyBlocks, KpiMutedValue } from "@/src/components/KpiCurrency";
import { SectionErrorBoundary } from "@/src/components/SectionErrorBoundary";
import { SectionErrorNotice } from "@/src/components/SectionErrorNotice";
import { ClientesIcon, ReceiptIcon, TrendingUpIcon, WalletIcon } from "@/src/components/Icons";
import { customerKpisQueryKey, useCustomerKpis } from "../hooks/useCustomerKpis";
import { formatKpiCurrencyAmount, formatKpiPct, plural } from "@/src/utils/kpiFormat";
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

const SEPARATE_CURRENCIES_NOTE = "Cada moneda va por separado: los importes de monedas distintas no se suman.";

/**
 * Ventas por cliente: un bloque por moneda con el total facturado, los clientes
 * facturados y la concentración del top. Sin meta ni semáforo (el backend no
 * los expone): sin insignia y sin barra.
 */
function salesCard(kpi: CustomerSalesKpi, onDrillDown: () => void): KpiCompactItem {
  const base = { label: "Ventas por cliente", icon: TrendingUpIcon };
  if (!kpi.disponible) {
    return { ...base, ...KPI_MUTED_ICON, value: null, unavailableReason: kpi.motivo };
  }
  const blocks = kpi.por_moneda.map((moneda) => {
    const facturados = `${moneda.total_clientes_facturados} ${plural(moneda.total_clientes_facturados, "cliente facturado", "clientes facturados")}`;
    // N real del top (hasta 5): su `pct_acumulado` es la concentración en ESA moneda.
    const last = moneda.top_clientes.at(-1);
    return {
      moneda: moneda.moneda,
      monto: moneda.total_facturado,
      detail: last ? `${facturados} · Top ${moneda.top_clientes.length}: ${formatKpiPct(last.pct_acumulado)}` : facturados,
    };
  });
  const hasSales = kpi.por_moneda.some((moneda) => moneda.total_facturado > 0);
  return {
    ...base,
    ...(hasSales ? { iconClass: "text-sky-500" } : KPI_MUTED_ICON),
    value: blocks.length === 0 ? <KpiMutedValue>Sin facturación</KpiMutedValue> : <KpiCurrencyBlocks blocks={blocks} />,
    info:
      "Facturas emitidas y vigentes (sin borradores ni canceladas) de los clientes que puedes ver; " +
      `el detalle muestra los clientes que más concentran la facturación. ${SEPARATE_CURRENCIES_NOTE}`,
    hideProgress: true,
    action: (
      <KpiDrillDownButton
        label="Ver top"
        ariaLabel="Ver clientes con más facturación"
        isEmpty={kpi.por_moneda.length === 0}
        onClick={onDrillDown}
      />
    ),
  };
}

/**
 * Clientes activos vs. inactivos, con drill-down de ambas listas (el backend
 * las manda cortadas en 20). `pct_activos` llega `null` sin clientes: entonces
 * no se pinta porcentaje.
 */
function activeCard(kpi: CustomerActiveKpi, onDrillDown: () => void): KpiCompactItem {
  const base = { label: "Clientes activos vs. inactivos", icon: ClientesIcon };
  if (!kpi.disponible) {
    return { ...base, ...KPI_MUTED_ICON, value: null, unavailableReason: kpi.motivo };
  }
  const split = `de ${kpi.total} · ${kpi.inactivos} ${plural(kpi.inactivos, "inactivo", "inactivos")}`;
  return {
    ...base,
    ...(kpi.activos > 0 ? { iconClass: "text-emerald-500" } : KPI_MUTED_ICON),
    value: String(kpi.activos),
    info:
      "Un cliente está activo si tiene al menos un pedido Por autorizar, Autorizado o En proceso " +
      `creado en los últimos ${kpi.ventana_dias} días; los borradores y los cancelados no cuentan.`,
    hideProgress: true,
    detail: kpi.pct_activos === null ? split : `${formatKpiPct(kpi.pct_activos)} ${split}`,
    action: (
      <KpiDrillDownButton
        label="Ver clientes"
        ariaLabel="Ver clientes activos e inactivos"
        isEmpty={kpi.total === 0}
        onClick={onDrillDown}
      />
    ),
  };
}

/**
 * Saldo vencido por antigüedad: un bloque por moneda con su saldo y el conteo
 * por tramo; los montos por tramo y el saldo sin fecha de vencimiento van en el
 * ⓘ (no caben en la tarjeta). El conteo global sí cruza monedas.
 */
function carteraCard(kpi: CustomerCarteraKpi, onDrillDown: () => void): KpiCompactItem {
  // "(general)": es el agregado del listado, para no confundirlo con la
  // antigüedad de saldos de UN cliente que muestra su detalle. No dice "todos
  // los clientes" porque el alcance depende del rol (un vendedor solo ve los
  // suyos).
  const base = { label: "Antigüedad de cartera (general)", icon: WalletIcon };
  if (!kpi.disponible) {
    return { ...base, ...KPI_MUTED_ICON, value: null, unavailableReason: kpi.motivo };
  }
  const blocks = kpi.por_moneda.map((moneda) => ({
    moneda: moneda.moneda,
    monto: moneda.saldo_total_vencido,
    detail: `1–30: ${moneda.buckets["0_30"].total} · 31–60: ${moneda.buckets["31_60"].total} · 61+: ${moneda.buckets["60_mas"].total}`,
  }));
  const montosPorTramo = kpi.por_moneda.map(
    ({ moneda, buckets }) =>
      `${moneda}: 1 a 30 ${formatKpiCurrencyAmount(buckets["0_30"].monto, moneda)} · ` +
      `31 a 60 ${formatKpiCurrencyAmount(buckets["31_60"].monto, moneda)} · ` +
      `61 o más ${formatKpiCurrencyAmount(buckets["60_mas"].monto, moneda)}.`,
  );
  const sinVencimiento = kpi.sin_vencimiento.map(
    ({ moneda, total, monto }) =>
      `${moneda}: ${formatKpiCurrencyAmount(monto, moneda)} en ${total} ${plural(total, "cuenta", "cuentas")}`,
  );
  const cuentasSinVencimiento = kpi.sin_vencimiento.reduce((sum, fila) => sum + fila.total, 0);
  const vencidas = `${kpi.total_cuentas_vencidas} ${plural(kpi.total_cuentas_vencidas, "cuenta vencida", "cuentas vencidas")}`;
  const detail =
    cuentasSinVencimiento > 0
      ? `${vencidas} · ${cuentasSinVencimiento} sin fecha de vencimiento`
      : vencidas;
  const info = [
    montosPorTramo.length > 0 ? `Saldo vencido por días de atraso — ${montosPorTramo.join(" ")}` : "Sin saldo vencido.",
    sinVencimiento.length > 0
      ? `Saldo sin fecha de vencimiento (no se cuenta como vencido) — ${sinVencimiento.join(" · ")}.`
      : null,
    "Sin cuentas de facturas canceladas o dadas de baja.",
    SEPARATE_CURRENCIES_NOTE,
  ]
    .filter(Boolean)
    .join(" ");
  return {
    ...base,
    ...(kpi.total_cuentas_vencidas > 0 ? { iconClass: "text-red-500" } : KPI_MUTED_ICON),
    value: blocks.length === 0 ? <KpiMutedValue>Sin saldo vencido</KpiMutedValue> : <KpiCurrencyBlocks blocks={blocks} />,
    info,
    hideProgress: true,
    detail,
    action: (
      <KpiDrillDownButton
        label="Ver cuentas"
        ariaLabel="Ver cuentas por cobrar vencidas"
        isEmpty={kpi.drill_down.length === 0 && kpi.sin_vencimiento.length === 0}
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
    activeCard(data.clientes_activos, () => openDrillDown("clientes_activos")),
    // Hoy siempre llega no disponible (ver `buildUntypedKpiCard`).
    buildUntypedKpiCard(data.reclamos_devoluciones, { label: "Tasa de reclamos o devoluciones", icon: ReceiptIcon }),
    carteraCard(data.cartera_antiguedad, () => openDrillDown("cartera_antiguedad")),
  ];
}

function CustomerKpisSectionContent() {
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
    <>
      {body}
      <CustomerKpiDrillDownDialog
        open={isDrillDownOpen}
        kind={drillDownKind}
        data={data}
        onClose={() => setIsDrillDownOpen(false)}
      />
    </>
  );
}

/**
 * Aviso del límite de error de la sección. "Reintentar" vuelve a PEDIR los
 * indicadores antes de remontar: remontar con el mismo payload lanzaría igual.
 */
function CustomerKpisRenderError({ reset }: { reset: () => void }) {
  const queryClient = useQueryClient();
  const isFetching = useIsFetching({ queryKey: customerKpisQueryKey }) > 0;
  const retry = async () => {
    await queryClient.refetchQueries({ queryKey: customerKpisQueryKey });
    reset();
  };
  return (
    <SectionErrorNotice
      title="No se pudieron mostrar los indicadores"
      message="Ocurrió un error al mostrarlos. La lista de clientes sigue disponible."
      onRetry={() => void retry()}
      isRetrying={isFetching}
    />
  );
}

/**
 * Indicadores de clientes (`GET /terceros/clientes/kpis/`): ventas por cliente,
 * activos vs. inactivos, reclamos y devoluciones, y cartera vencida, en ese
 * orden. Todo es el valor del backend; aquí no se calcula ningún indicador ni
 * se suman importes de monedas distintas. Cada bloque decide solo por su
 * `disponible`.
 *
 * Tiene su propia consulta (carga y falla dentro de la sección) y su propio
 * límite de error: si el payload cambia de forma y el render lanza, se pinta un
 * aviso aquí y la lista de clientes sigue usable. Sin gate de permiso: la ruta
 * ya exige `R-CRM-CLIENTES` (`routePermissions`). Mismo patrón que
 * `PedidoKpisSection`.
 */
export function CustomerKpisSection() {
  return (
    <section aria-label={SECTION_TITLE}>
      <SectionErrorBoundary fallback={(reset) => <CustomerKpisRenderError reset={reset} />}>
        <CustomerKpisSectionContent />
      </SectionErrorBoundary>
    </section>
  );
}
