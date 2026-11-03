"use client";

import { useState, type ReactNode } from "react";
import KpiGrid, { KPI_MUTED_ICON, KpiGridSkeleton, type KpiCompactItem } from "@/src/components/KpiGrid";
import { KpiDrillDownButton } from "@/src/components/KpiDrillDownButton";
import { KpiSectionErrorBoundary } from "@/src/components/KpiSectionErrorBoundary";
import { SectionErrorNotice } from "@/src/components/SectionErrorNotice";
import { ClockIcon, EmbarquesIcon, ShieldCheckIcon, StarIcon } from "@/src/components/Icons";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatKpiDias, formatKpiPct, formatKpiPctOrDash, plural } from "@/src/utils/kpiFormat";
import { isSupplierKpisSinEmpresa } from "@/src/features/purchase-orders/utils/kpiSinEmpresa";
import { supplierKpisQueryKey, useSupplierKpis } from "../hooks/useSupplierKpis";
import type { SupplierKpiRow, SupplierKpis } from "../interfaces/supplier-kpis.interface";
import {
  aggregateLeadTime,
  aggregateOnTimeDelivery,
  aggregateQuality,
  aggregateScorecard,
  getSupplierKpiTruncationNote,
} from "../utils/supplierKpis";
import { SupplierKpiDialog, type SupplierKpiDialogKind } from "./SupplierKpiDialog";
import { SupplierKpiDetailDialog, type SupplierKpiDetailTarget } from "./SupplierKpiDetailDialog";

const SECTION_TITLE = "Indicadores";

/** `proveedores: []` con `disponible: true`: sin actividad de proveedores. */
const NO_ACTIVITY_REASON = "No hay actividad de proveedores para calcular este indicador.";

/** Ninguna recepción tiene fecha prometida contra la cual medir. */
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

/**
 * Entrega a tiempo: recepciones a tiempo sobre recepciones con fecha prometida
 * (mismo criterio que el backend por proveedor). Sin ninguna recepción con
 * fecha prometida, no disponible. Sin meta: sin barra ni insignia.
 */
function onTimeCard(rows: SupplierKpiRow[], onOpen: () => void): KpiCompactItem {
  const onTime = aggregateOnTimeDelivery(rows);
  if (!onTime) return unavailable(LABELS.onTime, NO_DUE_DATE_REASON);
  const { pct, aTiempo, total } = onTime;
  return {
    ...LABELS.onTime,
    iconClass: "text-sky-500",
    value: formatKpiPct(pct),
    info:
      "Recepciones que llegaron en o antes de la fecha de entrega estimada de su OC. " +
      "Las recepciones de OCs sin esa fecha no cuentan: no se puede saber si llegaron tarde.",
    hideProgress: true,
    detail: `${formatQuantityValue(aTiempo)} de ${formatQuantityValue(total)} ${plural(total, "recepción", "recepciones")} a tiempo`,
    action: <KpiDrillDownButton label="Por proveedor" ariaLabel="Ver entrega a tiempo por proveedor" isEmpty={false} onClick={onOpen} />,
  };
}

/** Calidad: % rechazado en Calidad sobre lo inspeccionado; "—" sin inspecciones. */
function qualityCard(rows: SupplierKpiRow[], onOpen: () => void): KpiCompactItem {
  const { pct, rechazada, inspeccionada } = aggregateQuality(rows);
  return {
    ...LABELS.quality,
    // Sin meta: color neutro (el rojo se leería como "fuera de meta").
    ...(pct !== null ? { iconClass: "text-sky-500" } : KPI_MUTED_ICON),
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
 * Lead time: el real como valor y el pactado como detalle, los dos ponderados
 * por las recepciones medidas (el backend promedia ambos sobre las mismas
 * recepciones, así que son comparables). Sin recepciones con fecha prometida,
 * el pactado no está disponible.
 */
function leadTimeCard(rows: SupplierKpiRow[], onOpen: () => void): KpiCompactItem {
  const { dias, diasPactado, recepciones } = aggregateLeadTime(rows);
  // Real y pactado salen de las mismas recepciones medidas: hay pactado si hay alguna.
  const hasPactado = recepciones > 0;
  return {
    ...LABELS.leadTime,
    ...(dias !== null ? { iconClass: "text-violet-500" } : KPI_MUTED_ICON),
    value: formatKpiDias(dias),
    info:
      "Real: días desde la fecha de la OC hasta cada recepción. Pactado: días desde la fecha de la OC " +
      "hasta su fecha de entrega estimada. Ambos se promedian sobre las mismas recepciones: las de OCs " +
      "con fecha de entrega estimada.",
    hideProgress: true,
    detail: hasPactado ? `Pactado: ${formatKpiDias(diasPactado)}` : "Pactado no disponible",
    detailTitle: hasPactado
      ? "Lead time pactado promedio, sobre las mismas recepciones que el real"
      : "Lead time pactado no disponible: ninguna recepción es de una OC con fecha de entrega estimada",
    action: (
      <KpiDrillDownButton label="Por proveedor" ariaLabel="Ver lead time por proveedor" isEmpty={recepciones === 0} onClick={onOpen} />
    ),
  };
}

/**
 * Scorecard: cuántos proveedores están en verde. Se muestra con o sin permiso
 * de importes: el factor de precio entra al puntaje por su porcentaje, que no
 * es un importe (backend #859). Sin semáforo a nivel tarjeta. Su drill-down es
 * el ranking por puntaje, y cada proveedor abre su detalle por factor.
 */
function scorecardCard(rows: SupplierKpiRow[], onOpen: () => void): KpiCompactItem {
  const { enVerde, evaluados } = aggregateScorecard(rows);
  return {
    ...LABELS.scorecard,
    ...(evaluados > 0 ? { iconClass: "text-emerald-500" } : KPI_MUTED_ICON),
    value: evaluados > 0 ? `${enVerde} de ${evaluados}` : "—",
    info:
      "En verde = puntaje de 80 o más. El puntaje promedia los factores con dato de cada proveedor: " +
      "puntualidad, calidad, cumplimiento de cantidad y precio. Un factor sin dato (p. ej. puntualidad " +
      "sin fechas de entrega estimada) no cuenta.",
    hideProgress: true,
    detail: evaluados > 0 ? "en verde" : "Sin proveedores evaluados",
    action: (
      <KpiDrillDownButton label="Por proveedor" ariaLabel="Ver scorecard por proveedor" isEmpty={evaluados === 0} onClick={onOpen} />
    ),
  };
}

/** Exportada para las pruebas unitarias (`tests/unit/procurement-kpi-scope.spec.ts`). */
export function buildCards(
  data: SupplierKpis,
  openDialog: (kind: SupplierKpiDialogKind) => void,
): KpiCompactItem[] {
  // Sin empresa el backend lo dice a nivel raíz: las cuatro tarjetas con su motivo.
  if (isSupplierKpisSinEmpresa(data)) {
    return Object.values(LABELS).map((base) => unavailable(base, data.motivo));
  }
  const rows = data.proveedores;
  if (rows.length === 0) {
    return Object.values(LABELS).map((base) => unavailable(base, NO_ACTIVITY_REASON));
  }
  const cards = [
    onTimeCard(rows, () => openDialog("entrega_a_tiempo")),
    qualityCard(rows, () => openDialog("calidad")),
    leadTimeCard(rows, () => openDialog("lead_time")),
    scorecardCard(rows, () => openDialog("scorecard")),
  ];
  // Con el ranking cortado, cada agregado lo dice en su ⓘ (las tarjetas no
  // disponibles no agregan nada).
  const truncationNote = getSupplierKpiTruncationNote(data);
  if (!truncationNote) return cards;
  return cards.map((card) => (card.info ? { ...card, info: `${card.info} ${truncationNote}` } : card));
}

function SupplierKpisSectionContent() {
  const { data, isInitialError, isFetching, refetch } = useSupplierKpis();

  // `dialogKind` es el ÚLTIMO detalle abierto y no se limpia al cerrar: así el
  // diálogo conserva título y filas durante su animación de salida.
  const [dialogKind, setDialogKind] = useState<SupplierKpiDialogKind | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const openDialog = (kind: SupplierKpiDialogKind) => {
    setDialogKind(kind);
    setIsDialogOpen(true);
  };

  // Detalle por factor de un proveedor, abierto desde el ranking del Scorecard
  // y apilado sobre él: al cerrarlo se vuelve al ranking. Vive aquí y no en
  // una fila del ranking (las filas se rearman en cada refetch).
  const [detailSupplier, setDetailSupplier] = useState<SupplierKpiDetailTarget | null>(null);

  let body: ReactNode;
  if (data) {
    body = <KpiGrid compact items={buildCards(data, openDialog)} />;
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
      <SupplierKpiDialog
        open={isDialogOpen}
        kind={dialogKind}
        data={data}
        onClose={() => setIsDialogOpen(false)}
        onOpenSupplier={(row) => setDetailSupplier({ id: row.proveedor_id, nombre: row.proveedor_nombre })}
      />
      <SupplierKpiDetailDialog
        open={detailSupplier !== null}
        supplier={detailSupplier}
        onClose={() => setDetailSupplier(null)}
      />
    </>
  );
}

/**
 * Indicadores de proveedores (`GET /terceros/proveedores/kpis/`, EC-436):
 * entrega a tiempo, calidad, lead time y scorecard, en ese orden. El backend
 * manda un ranking por proveedor; las tarjetas suman sus conteos
 * (`utils/supplierKpis.ts`) y cada drill-down es ese mismo ranking. El del
 * Scorecard abre además el detalle por factor de un proveedor
 * (`kpis-detalle/`, `SupplierKpiDetailDialog`).
 *
 * Tiene su propia consulta: carga y falla dentro de la sección sin tocar la
 * tabla de proveedores. La ruta ya exige `R-COMPRAS-PROV` (`routePermissions`).
 *
 * Ninguna tarjeta muestra importes, así que no depende de `puede_ver_importes`
 * (el detalle por factor usa el que trae su propia respuesta):
 * sin permiso el backend solo quita `costo_facturado` y `costo_pactado_oc` de
 * `diferencia_precio.por_moneda[]` (#859), que la UI no usa. Porcentajes,
 * puntaje y ranking llegan igual con o sin permiso.
 *
 * Tiene su propio límite de error: si el payload cambia de forma y el render
 * lanza, se pinta un aviso aquí y la tabla de proveedores sigue usable.
 */
export function SupplierKpisSection() {
  return (
    <section aria-label={SECTION_TITLE}>
      <KpiSectionErrorBoundary
        queryKey={supplierKpisQueryKey}
        message="Ocurrió un error al mostrarlos. La tabla de proveedores sigue disponible."
      >
        <SupplierKpisSectionContent />
      </KpiSectionErrorBoundary>
    </section>
  );
}
