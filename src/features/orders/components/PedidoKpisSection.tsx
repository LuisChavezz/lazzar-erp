"use client";

import { useState, type ReactNode } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import KpiGrid, {
  buildUntypedKpiCard,
  KPI_MUTED_ICON,
  KpiGridSkeleton,
  type KpiCompactItem,
} from "@/src/components/KpiGrid";
import { KpiCurrencyBlocks, KpiMutedValue } from "@/src/components/KpiCurrency";
import { KpiDrillDownButton } from "@/src/components/KpiDrillDownButton";
import { SectionErrorBoundary } from "@/src/components/SectionErrorBoundary";
import { SectionErrorNotice } from "@/src/components/SectionErrorNotice";
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PedidosIcon,
} from "@/src/components/Icons";
import { plural } from "@/src/utils/kpiFormat";
import { PEDIDO_KPIS_QUERY_KEY } from "../constants/pedidoKpis";
import { usePedidoKpis } from "../hooks/usePedidoKpis";
import type { PedidoActiveKpi, PedidoKpis } from "../interfaces/pedido-kpis.interface";
import { PedidoKpiDrillDownDialog } from "./PedidoKpiDrillDownDialog";

const SECTION_TITLE = "Indicadores";

/**
 * Pedidos activos: un bloque por moneda con su valor y, en el detalle, el conteo
 * de todas las monedas (un conteo sí se puede sumar; un importe no). Sin meta
 * ni semáforo (el backend no los expone), así que sin insignia y sin barra:
 * "llena" no significaría nada.
 */
function activeCard(kpi: PedidoActiveKpi, onDrillDown: () => void): KpiCompactItem {
  const base = { label: "Pedidos activos", icon: PedidosIcon };
  if (!kpi.disponible) {
    return { ...base, ...KPI_MUTED_ICON, value: null, unavailableReason: kpi.motivo };
  }
  // Con una sola moneda su conteo es el del detalle: no se repite en el bloque.
  const showCurrencyCount = kpi.por_moneda.length > 1;
  const blocks = kpi.por_moneda.map((moneda) => ({
    moneda: moneda.moneda,
    monto: moneda.valor,
    detail: showCurrencyCount ? `${moneda.total} ${plural(moneda.total, "pedido", "pedidos")}` : undefined,
  }));
  return {
    ...base,
    ...(kpi.total > 0 ? { iconClass: "text-sky-500" } : KPI_MUTED_ICON),
    value:
      blocks.length === 0 ? <KpiMutedValue>Sin pedidos activos</KpiMutedValue> : <KpiCurrencyBlocks blocks={blocks} />,
    info:
      "Pedidos autorizados o en proceso de tus cotizaciones; el valor es la suma de sus totales. " +
      "Cada moneda va por separado: los importes de monedas distintas no se suman.",
    hideProgress: true,
    ...(kpi.total > 0 ? { detail: `${kpi.total} ${plural(kpi.total, "pedido activo", "pedidos activos")}` } : {}),
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

function PedidoKpisSectionContent() {
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
    <>
      {body}
      <PedidoKpiDrillDownDialog
        open={isDrillDownOpen}
        kpi={data?.pedidos_activos}
        onClose={() => setIsDrillDownOpen(false)}
      />
    </>
  );
}

/**
 * Aviso del límite de error de la sección. "Reintentar" vuelve a PEDIR los
 * indicadores antes de remontar: remontar con el mismo payload lanzaría igual.
 */
function PedidoKpisRenderError({ reset }: { reset: () => void }) {
  const queryClient = useQueryClient();
  const isFetching = useIsFetching({ queryKey: PEDIDO_KPIS_QUERY_KEY }) > 0;
  const retry = async () => {
    await queryClient.refetchQueries({ queryKey: PEDIDO_KPIS_QUERY_KEY });
    reset();
  };
  return (
    <SectionErrorNotice
      title="No se pudieron mostrar los indicadores"
      message="Ocurrió un error al mostrarlos. La lista de pedidos sigue disponible."
      onRetry={() => void retry()}
      isRetrying={isFetching}
    />
  );
}

/**
 * Indicadores de "Mis pedidos" (`GET /ventas/pedidos/kpis/`): pedidos activos,
 * OTIF, lead time promedio y pedidos en riesgo, en ese orden. Todo es el valor
 * del backend; aquí no se calcula ningún indicador ni se suman importes de
 * monedas distintas. Cada bloque decide solo por su `disponible`.
 *
 * Tiene su propia consulta (carga y falla dentro de la sección) y su propio
 * límite de error: si el payload cambia de forma y el render lanza, se pinta un
 * aviso aquí y la lista de pedidos sigue usable. Sin gate de permiso: la ruta
 * ya exige `R-CRM-PEDIDOS` (`routePermissions`). Mismo patrón que
 * `CustomerKpisSection`.
 */
export function PedidoKpisSection() {
  return (
    <section aria-label={SECTION_TITLE}>
      <SectionErrorBoundary fallback={(reset) => <PedidoKpisRenderError reset={reset} />}>
        <PedidoKpisSectionContent />
      </SectionErrorBoundary>
    </section>
  );
}
