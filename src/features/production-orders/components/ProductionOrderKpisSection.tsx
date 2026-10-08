"use client";

import { useState, type ReactNode } from "react";
import KpiGrid, { type KpiItem } from "@/src/components/KpiGrid";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { SectionErrorNotice } from "@/src/components/SectionErrorNotice";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  CheckCircleIcon,
  ChevronRightIcon,
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
  ProductionOrderUntypedKpi,
} from "../interfaces/production-order-kpis.interface";
import { formatKpiPct } from "../utils/productionOrderKpiFormat";
import {
  ProductionOrderKpiDrillDownDialog,
  type ProductionOrderKpiDrillDownKind,
} from "./ProductionOrderKpiDrillDownDialog";

const SECTION_TITLE = "Indicadores";

/** Colores de una tarjeta sin semáforo o no disponible. */
const MUTED_ICON = { iconClass: "text-slate-400", iconBgClass: "bg-slate-50 dark:bg-slate-500/10" };

/**
 * Botón del drill-down. Sin conteo a propósito: la lista llega cortada en 20
 * filas y su largo contradiría la cifra de la tarjeta; el "Mostrando X de N"
 * va dentro del diálogo. Deshabilitado con la lista vacía (abriría un diálogo
 * sin filas). Un bloque no disponible no lo pinta.
 */
function DrillDownButton({
  label,
  isEmpty,
  onClick,
}: {
  label: string;
  isEmpty: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isEmpty}
      className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 cursor-pointer transition-colors disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-500"
    >
      {label}
      <ChevronRightIcon className="w-3 h-3" aria-hidden="true" />
    </button>
  );
}

function onTimeCard(kpi: ProductionOrderOnTimeKpi, onDrillDown: () => void): KpiItem {
  const base = { label: "Cumplimiento a tiempo", icon: CheckCircleIcon };
  if (!kpi.disponible) {
    return {
      ...base,
      ...MUTED_ICON,
      value: null,
      unavailableReason: kpi.motivo,
    };
  }
  const semaforo = getKpiSemaforoConfig(kpi.semaforo);
  return {
    ...base,
    iconClass: semaforo.iconClass,
    iconBgClass: semaforo.iconBgClass,
    // `pct: null` (sin OPs terminadas): guion, nunca un 0%.
    value: kpi.pct === null ? "—" : formatKpiPct(kpi.pct),
    subLabel: `Meta ${formatKpiPct(kpi.meta)}`,
    // Config de una sola llave: `StatusBadge` nunca indexa con un valor desconocido.
    badge: <StatusBadge status={kpi.semaforo} config={{ [kpi.semaforo]: semaforo }} />,
    progress: kpi.pct ?? 0,
    footer: (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {kpi.ops_terminadas === 0
            ? "Sin OPs terminadas"
            : `${kpi.ops_a_tiempo} de ${kpi.ops_terminadas} OPs a tiempo`}
        </span>
        <DrillDownButton
          label="Ver tardías"
          isEmpty={kpi.drill_down_tardias.length === 0}
          onClick={onDrillDown}
        />
      </div>
    ),
  };
}

/**
 * Avance y eficiencia: hoy siempre llegan no disponibles. Si el backend los
 * habilita, la tarjeta deja de decir "No disponible" sola, pero su forma
 * disponible aún no está en el contrato: no se pinta ninguna cifra hasta
 * integrarla.
 */
function untypedCard(
  kpi: ProductionOrderUntypedKpi,
  base: Pick<KpiItem, "label" | "icon">,
): KpiItem {
  if (!kpi.disponible) {
    return { ...base, ...MUTED_ICON, value: null, unavailableReason: kpi.motivo };
  }
  return {
    ...base,
    ...MUTED_ICON,
    value: "—",
    subLabel: "Sin datos",
    progress: 0,
  };
}

function overdueCard(kpi: ProductionOrderOverdueKpi, onDrillDown: () => void): KpiItem {
  const base = { label: "OPs atrasadas", icon: ExclamationTriangleIcon };
  if (!kpi.disponible) {
    return {
      ...base,
      ...MUTED_ICON,
      value: null,
      unavailableReason: kpi.motivo,
    };
  }
  const hasOverdue = kpi.total > 0;
  return {
    ...base,
    ...(hasOverdue
      ? { iconClass: "text-red-500", iconBgClass: "bg-red-50 dark:bg-red-500/10" }
      : MUTED_ICON),
    value: String(kpi.total),
    subLabel: kpi.nota,
    // Un conteo sin meta: una barra llena se leería como 100%.
    hideProgress: true,
    footer: (
      <div className="flex justify-end">
        <DrillDownButton label="Ver OPs" isEmpty={kpi.drill_down.length === 0} onClick={onDrillDown} />
      </div>
    ),
  };
}

function buildCards(
  data: ProductionOrderKpis,
  openDrillDown: (kind: ProductionOrderKpiDrillDownKind) => void,
): KpiItem[] {
  return [
    onTimeCard(data.cumplimiento_a_tiempo, () => openDrillDown("cumplimiento_a_tiempo")),
    untypedCard(data.avance_produccion, { label: "Avance de producción", icon: TrendingUpIcon }),
    untypedCard(data.eficiencia_linea, { label: "Eficiencia de línea", icon: FactoryIcon }),
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
    body = <KpiGrid items={buildCards(data, openDrillDown)} />;
  } else if (isInitialError) {
    body = (
      <SectionErrorNotice
        title="No se pudieron cargar los indicadores"
        message="El listado de órdenes sigue disponible. Intenta de nuevo en unos momentos."
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    );
  } else {
    body = (
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        aria-busy="true"
        aria-label="Cargando indicadores"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <LoadingSkeleton key={index} className="h-40" />
        ))}
      </div>
    );
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
