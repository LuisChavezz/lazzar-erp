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
import { KpiStatusDot } from "@/src/components/KpiStatusDot";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  FactoryIcon,
  TrendingUpIcon,
} from "@/src/components/Icons";
import { getKpiSemaforoConfig } from "../constants/productionOrderKpis";
import { useProductionOrderKpis } from "../hooks/useProductionOrderKpis";
import type {
  ProductionOrderKpis,
  ProductionOrderOnTimeKpi,
  ProductionOrderOverdueKpi,
} from "../interfaces/production-order-kpis.interface";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatKpiPct } from "../utils/productionOrderKpiFormat";
import {
  ProductionOrderKpiDrillDownDialog,
  type ProductionOrderKpiDrillDownKind,
} from "./ProductionOrderKpiDrillDownDialog";

const SECTION_TITLE = "Indicadores";

function onTimeCard(kpi: ProductionOrderOnTimeKpi, onDrillDown: () => void): KpiCompactItem {
  const base = { label: "Cumplimiento a tiempo", icon: CheckCircleIcon };
  if (!kpi.disponible) {
    return {
      ...base,
      ...KPI_MUTED_ICON,
      value: null,
      unavailableReason: kpi.motivo,
    };
  }
  const semaforo = getKpiSemaforoConfig(kpi.semaforo);
  const meta = `Meta ${formatKpiPct(kpi.meta)}`;
  // "a tiempo/terminadas"; el histórico llega a 4 dígitos.
  const counts =
    kpi.ops_terminadas === 0
      ? "Sin OPs terminadas"
      : `${formatQuantityValue(kpi.ops_a_tiempo)}/${formatQuantityValue(kpi.ops_terminadas)}`;
  return {
    ...base,
    iconClass: semaforo.iconClass,
    // `pct: null` (sin OPs terminadas): guion, nunca un 0%.
    value: kpi.pct === null ? "—" : formatKpiPct(kpi.pct),
    // Punto + texto (variante compacta); la entrada ya viene resuelta con respaldo neutro.
    badge: <KpiStatusDot status={kpi.semaforo} entry={semaforo} />,
    progress: kpi.pct ?? 0,
    // Visible sin "a tiempo" (lo dice el título de la tarjeta); el `title` lo conserva.
    detail: `${meta} · ${counts}`,
    detailTitle: kpi.ops_terminadas === 0 ? `${meta} · ${counts}` : `${meta} · ${counts} a tiempo`,
    action: (
      <KpiDrillDownButton
        label="Tardías"
        ariaLabel="Ver OPs tardías"
        isEmpty={kpi.drill_down_tardias.length === 0}
        onClick={onDrillDown}
      />
    ),
  };
}

function overdueCard(kpi: ProductionOrderOverdueKpi, onDrillDown: () => void): KpiCompactItem {
  const base = { label: "OPs atrasadas", icon: ExclamationTriangleIcon };
  if (!kpi.disponible) {
    return {
      ...base,
      ...KPI_MUTED_ICON,
      value: null,
      unavailableReason: kpi.motivo,
    };
  }
  const hasOverdue = kpi.total > 0;
  return {
    ...base,
    ...(hasOverdue
      ? { iconClass: "text-red-500" }
      : KPI_MUTED_ICON),
    value: String(kpi.total),
    // La nota del backend es larga: va al popover ⓘ.
    info: kpi.nota,
    // Un conteo sin meta: una barra llena se leería como 100%.
    hideProgress: true,
    action: <KpiDrillDownButton label="Ver OPs" isEmpty={kpi.drill_down.length === 0} onClick={onDrillDown} />,
  };
}

function buildCards(
  data: ProductionOrderKpis,
  openDrillDown: (kind: ProductionOrderKpiDrillDownKind) => void,
): KpiCompactItem[] {
  return [
    onTimeCard(data.cumplimiento_a_tiempo, () => openDrillDown("cumplimiento_a_tiempo")),
    // Avance y eficiencia: hoy siempre llegan no disponibles (ver `buildUntypedKpiCard`).
    buildUntypedKpiCard(data.avance_produccion, { label: "Avance de producción", icon: TrendingUpIcon }),
    buildUntypedKpiCard(data.eficiencia_linea, { label: "Eficiencia de línea", icon: FactoryIcon }),
    overdueCard(data.ops_atrasadas, () => openDrillDown("ops_atrasadas")),
  ];
}

/**
 * Indicadores de OP (`GET /produccion/orden-produccion/kpis/`): cumplimiento a
 * tiempo, avance, eficiencia y OPs atrasadas, en ese orden. Todo es el valor
 * del backend; aquí no se calcula ningún indicador. Cada bloque decide solo por
 * su `disponible`.
 *
 * Tiene su propia consulta: carga y falla dentro de la sección sin tocar el
 * resto de la pantalla. El estado del drill-down vive aquí, no en las tarjetas.
 */
export function ProductionOrderKpisSection() {
  const { data, isInitialError, isFetching, refetch } = useProductionOrderKpis();
  // `drillDownKind` es el ÚLTIMO drill-down abierto y no se limpia al cerrar:
  // así el diálogo conserva título y filas durante su animación de salida.
  const [drillDownKind, setDrillDownKind] = useState<ProductionOrderKpiDrillDownKind | null>(null);
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);
  const openDrillDown = (kind: ProductionOrderKpiDrillDownKind) => {
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
      <ProductionOrderKpiDrillDownDialog
        open={isDrillDownOpen}
        kind={drillDownKind}
        data={data}
        onClose={() => setIsDrillDownOpen(false)}
      />
    </section>
  );
}
