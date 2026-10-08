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
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PedidosIcon,
} from "@/src/components/Icons";
import { formatMoneyValue, NO_CURRENCY_FORMAT } from "@/src/utils/formatCurrency";
import { usePedidoKpis } from "../hooks/usePedidoKpis";
import type { PedidoActiveKpi, PedidoKpis } from "../interfaces/pedido-kpis.interface";
import { PedidoKpiDrillDownDialog } from "./PedidoKpiDrillDownDialog";

const SECTION_TITLE = "Indicadores";

/**
 * Pedidos activos: conteo + valor. Sin meta ni semáforo (el backend no los
 * expone), así que sin insignia y sin barra: "llena" no significaría nada.
 */
function activeCard(kpi: PedidoActiveKpi, onDrillDown: () => void): KpiCompactItem {
  const base = { label: "Pedidos activos", icon: PedidosIcon };
  if (!kpi.disponible) {
    return { ...base, ...KPI_MUTED_ICON, value: null, unavailableReason: kpi.motivo };
  }
  // Sin símbolo: `valor` suma pedidos de monedas distintas y el payload no
  // trae `moneda`; un "$" afirmaría pesos.
  const valor = `Valor ${formatMoneyValue(kpi.valor, NO_CURRENCY_FORMAT)}`;
  return {
    ...base,
    ...(kpi.total > 0 ? { iconClass: "text-sky-500" } : KPI_MUTED_ICON),
    value: String(kpi.total),
    info: "Pedidos autorizados o en proceso de tus cotizaciones. El valor suma sus totales sin distinguir moneda.",
    hideProgress: true,
    detail: valor,
    action: (
      <KpiDrillDownButton
        label="Ver pedidos"
        ariaLabel="Ver pedidos activos"
        isEmpty={kpi.drill_down.length === 0}
        onClick={onDrillDown}
      />
    ),
  };
}

function buildCards(data: PedidoKpis, openDrillDown: () => void): KpiCompactItem[] {
  return [
    activeCard(data.pedidos_activos, openDrillDown),
    // OTIF, lead time y pedidos en riesgo: hoy siempre llegan no disponibles
    // (ver `buildUntypedKpiCard`).
    buildUntypedKpiCard(data.otif, { label: "OTIF", icon: CheckCircleIcon }),
    buildUntypedKpiCard(data.lead_time_promedio, { label: "Lead time promedio", icon: ClockIcon }),
    buildUntypedKpiCard(data.pedidos_en_riesgo, { label: "Pedidos en riesgo", icon: ExclamationTriangleIcon }),
  ];
}

/**
 * Indicadores de "Mis pedidos" (`GET /ventas/pedidos/kpis/`): pedidos activos,
 * OTIF, lead time promedio y pedidos en riesgo, en ese orden. Todo es el valor
 * del backend; aquí no se calcula ningún indicador. Cada bloque decide solo por
 * su `disponible`.
 *
 * Tiene su propia consulta: carga y falla dentro de la sección sin tocar la
 * lista de pedidos. Sin gate de permiso: la ruta ya exige `R-CRM-PEDIDOS`
 * (`routePermissions`). Mismo patrón que `ProductionOrderKpisSection`.
 */
export function PedidoKpisSection() {
  const { data, isInitialError, isFetching, refetch } = usePedidoKpis();
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);

  let body: ReactNode;
  if (data) {
    body = <KpiGrid compact items={buildCards(data, () => setIsDrillDownOpen(true))} />;
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
      <PedidoKpiDrillDownDialog
        open={isDrillDownOpen}
        kpi={data?.pedidos_activos}
        onClose={() => setIsDrillDownOpen(false)}
      />
    </section>
  );
}
