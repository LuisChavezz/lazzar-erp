"use client";

import { useState, type ReactNode } from "react";
import KpiGrid, { KPI_MUTED_ICON, KpiGridSkeleton, type KpiCompactItem } from "@/src/components/KpiGrid";
import { KpiDrillDownButton } from "@/src/components/KpiDrillDownButton";
import { SectionErrorNotice } from "@/src/components/SectionErrorNotice";
import { ClockIcon, EmbarquesIcon, ShieldCheckIcon, StarIcon } from "@/src/components/Icons";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatKpiPctOrDash, plural } from "@/src/utils/kpiFormat";
import { useSupplierKpis } from "../hooks/useSupplierKpis";
import type { SupplierKpiRow } from "../interfaces/supplier-kpis.interface";
import {
  aggregateLeadTime,
  aggregateOnTimeDelivery,
  aggregateQuality,
  aggregateScorecard,
  formatKpiDias,
  hasAgreedLeadTime,
} from "../utils/supplierKpis";
import { SupplierKpiDialog, type SupplierKpiDialogKind } from "./SupplierKpiDialog";

const SECTION_TITLE = "Indicadores";

/** `proveedores: []`: sin actividad de proveedores (o usuario sin empresa). */
const NO_ACTIVITY_REASON = "No hay actividad de proveedores para calcular este indicador.";

/** Mientras ninguna fila trae lead time pactado (ver `hasAgreedLeadTime`). */
const NO_DUE_DATE_REASON =
  "Las órdenes de compra no tienen fecha de entrega estimada contra la cual medir la puntualidad.";

const LABELS = {
  onTime: { label: "Entrega a tiempo", icon: EmbarquesIcon },
  quality: { label: "Calidad del proveedor", icon: ShieldCheckIcon },
  leadTime: { label: "Lead time real vs. pactado", icon: ClockIcon },
  scorecard: { label: "Scorecard general", icon: StarIcon },
} satisfies Record<string, Pick<KpiCompactItem, "label" | "icon">>;

const unavailable = (base: Pick<KpiCompactItem, "label" | "icon">, motivo: string): KpiCompactItem => ({
  ...base,
  ...KPI_MUTED_ICON,
  value: null,
  unavailableReason: motivo,
});

/** Entrega a tiempo: recepciones a tiempo sobre recepciones. Sin meta: sin barra ni insignia. */
function onTimeCard(rows: SupplierKpiRow[], onOpen: () => void): KpiCompactItem {
  if (!hasAgreedLeadTime(rows)) return unavailable(LABELS.onTime, NO_DUE_DATE_REASON);
  const { pct, aTiempo, total } = aggregateOnTimeDelivery(rows);
  return {
    ...LABELS.onTime,
    ...(pct !== null ? { iconClass: "text-sky-500" } : KPI_MUTED_ICON),
    value: formatKpiPctOrDash(pct),
    hideProgress: true,
    detail: `${formatQuantityValue(aTiempo)} de ${formatQuantityValue(total)} ${plural(total, "recepción", "recepciones")} a tiempo`,
    action: <KpiDrillDownButton label="Por proveedor" ariaLabel="Ver entrega a tiempo por proveedor" isEmpty={total === 0} onClick={onOpen} />,
  };
}

/** Calidad: % rechazado en Calidad sobre lo inspeccionado; "—" sin inspecciones. */
function qualityCard(rows: SupplierKpiRow[], onOpen: () => void): KpiCompactItem {
  const { pct, rechazada, inspeccionada } = aggregateQuality(rows);
  return {
    ...LABELS.quality,
    ...(pct !== null && pct > 0 ? { iconClass: "text-red-500" } : KPI_MUTED_ICON),
    value: formatKpiPctOrDash(pct),
    info:
      "Porcentaje rechazado en las inspecciones de Calidad sobre lo inspeccionado. " +
      "Suma las cantidades de todos los productos sin distinguir unidad de medida.",
    hideProgress: true,
    detail:
      inspeccionada > 0
        ? `${formatQuantityValue(rechazada)} de ${formatQuantityValue(inspeccionada)} rechazadas`
        : "Sin material inspeccionado",
    action: (
      <KpiDrillDownButton label="Por proveedor" ariaLabel="Ver calidad por proveedor" isEmpty={inspeccionada === 0} onClick={onOpen} />
    ),
  };
}

/**
 * Lead time: el real ponderado por recepciones. El pactado NO se agrega (no se
 * sabe sobre qué recepciones lo promedia el backend, #388): el detalle dice
 * que no está disponible o remite al drill-down.
 */
function leadTimeCard(rows: SupplierKpiRow[], onOpen: () => void): KpiCompactItem {
  const { dias, recepciones, hasPactado } = aggregateLeadTime(rows);
  return {
    ...LABELS.leadTime,
    ...(dias !== null ? { iconClass: "text-violet-500" } : KPI_MUTED_ICON),
    value: formatKpiDias(dias),
    info: "Días desde la fecha de la OC hasta cada recepción, promediados por recepción.",
    hideProgress: true,
    detail: hasPactado ? "Pactado: ver por proveedor" : "Pactado no disponible",
    detailTitle: hasPactado
      ? "El lead time pactado de cada proveedor está en el desglose por proveedor"
      : "Lead time pactado no disponible: las órdenes de compra no tienen fecha de entrega estimada",
    action: (
      <KpiDrillDownButton label="Por proveedor" ariaLabel="Ver lead time por proveedor" isEmpty={recepciones === 0} onClick={onOpen} />
    ),
  };
}

/**
 * Scorecard: cuántos proveedores están en verde. Sin semáforo a nivel tarjeta
 * y SIN drill-down: el puntaje se deriva de precios y aún no hay regla de
 * permisos para mostrarlo (backend #377).
 */
function scorecardCard(rows: SupplierKpiRow[]): KpiCompactItem {
  if (!hasAgreedLeadTime(rows)) return unavailable(LABELS.scorecard, NO_DUE_DATE_REASON);
  const { enVerde, evaluados } = aggregateScorecard(rows);
  return {
    ...LABELS.scorecard,
    ...(evaluados > 0 ? { iconClass: "text-emerald-500" } : KPI_MUTED_ICON),
    value: evaluados > 0 ? `${enVerde} de ${evaluados}` : "—",
    hideProgress: true,
    detail: evaluados > 0 ? "en verde" : "Sin proveedores evaluados",
  };
}

function buildCards(rows: SupplierKpiRow[], openDialog: (kind: SupplierKpiDialogKind) => void): KpiCompactItem[] {
  if (rows.length === 0) {
    return Object.values(LABELS).map((base) => unavailable(base, NO_ACTIVITY_REASON));
  }
  return [
    onTimeCard(rows, () => openDialog("entrega_a_tiempo")),
    qualityCard(rows, () => openDialog("calidad")),
    leadTimeCard(rows, () => openDialog("lead_time")),
    scorecardCard(rows),
  ];
}

/**
 * Indicadores de proveedores (`GET /terceros/proveedores/kpis/`, EC-436):
 * entrega a tiempo, calidad, lead time y scorecard, en ese orden. El backend
 * manda un ranking por proveedor; las tarjetas suman sus conteos
 * (`utils/supplierKpis.ts`) y cada drill-down es ese mismo ranking.
 *
 * Tiene su propia consulta: carga y falla dentro de la sección sin tocar la
 * tabla de proveedores. Sin gate de permiso: la ruta ya exige `R-COMPRAS-PROV`
 * (`routePermissions`). `diferencia_precio` y `puntaje` no se muestran en
 * ningún lado (backend #377).
 */
export function SupplierKpisSection() {
  const { data, isInitialError, isFetching, refetch } = useSupplierKpis();

  // `dialogKind` es el ÚLTIMO detalle abierto y no se limpia al cerrar: así el
  // diálogo conserva título y filas durante su animación de salida.
  const [dialogKind, setDialogKind] = useState<SupplierKpiDialogKind | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const openDialog = (kind: SupplierKpiDialogKind) => {
    setDialogKind(kind);
    setIsDialogOpen(true);
  };

  let body: ReactNode;
  if (data) {
    body = <KpiGrid compact items={buildCards(data.proveedores, openDialog)} />;
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
      <SupplierKpiDialog
        open={isDialogOpen}
        kind={dialogKind}
        data={data}
        onClose={() => setIsDialogOpen(false)}
      />
    </section>
  );
}
