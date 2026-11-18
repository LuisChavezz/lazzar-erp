"use client";

import { RouteIcon, ClipboardListIcon } from "@/src/components/Icons";
import { KpiCard, KpiGridSkeleton, type KpiItem } from "@/src/components/KpiGrid";
import { SectionErrorNotice } from "@/src/components/SectionErrorNotice";
import { usePickingKpis } from "../hooks/usePickingsTable";
import { toPickingPrioridadCounts } from "../utils/pickingList";
import { PickingPriorityBreakdown } from "./PickingPriorityBreakdown";

/**
 * KPIs del listado de Picking desde `GET /wms/pickings/kpis/` (EC-921), con los
 * MISMOS filtros y búsqueda que la tabla (`criteria` de `usePickingsTable`): las
 * tarjetas resumen lo que la tabla lista en todas sus páginas, no la página
 * visible. `estado` se deja fuera de las tarjetas a propósito: el filtro de
 * estatus ya lo acota en la tabla.
 *
 * Consulta PROPIA: carga y falla dentro de su sección (skeleton y aviso con
 * "Reintentar"); la tabla no depende de ella. Un refetch fallido conserva los
 * datos anteriores y avisa por toast (`useGuardedQuery`).
 *
 * El desglose por prioridad (`PickingPriorityBreakdown`) NO usa `KpiGrid`
 * completo a propósito: se arma la MISMA grilla a mano (`KpiCard` suelto) para
 * que el desglose entre como tercer miembro de la fila (`md:col-span-2`) y
 * quede a la misma altura que las dos tarjetas.
 */
export function PickingStats({ criteria }: { criteria: Readonly<Record<string, string>> }) {
  const { data, isInitialError, isFetching, isPlaceholderData, refetch } = usePickingKpis(criteria);

  if (!data) {
    return isInitialError ? (
      <SectionErrorNotice
        title="No se pudieron cargar los indicadores"
        message="Intenta de nuevo en unos momentos."
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    ) : (
      <KpiGridSkeleton count={4} label="Cargando indicadores de surtido" />
    );
  }

  const cards: KpiItem[] = [
    {
      label: "Total de Surtidos",
      value: String(data.total),
      icon: RouteIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      trendLabel: "Según filtros y búsqueda",
      status: "neutral",
    },
    {
      label: "Líneas por Surtir",
      value: String(data.lineas_por_surtir),
      icon: ClipboardListIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-500",
      trendLabel: "Trabajo pendiente",
      status: data.lineas_por_surtir > 0 ? "negative" : "positive",
    },
  ];

  // Con datos de los criterios ANTERIORES (`keepPreviousData`) mientras llegan
  // los nuevos: atenuados y `aria-busy`, igual que las filas de la tabla.
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 items-stretch gap-4${
        isPlaceholderData ? " opacity-60 transition-opacity" : ""
      }`}
      role="list"
      aria-busy={isPlaceholderData}
    >
      {cards.map((item, index) => (
        <KpiCard key={`${item.label}-${index}`} item={item} />
      ))}
      <PickingPriorityBreakdown
        breakdown={toPickingPrioridadCounts(data)}
        total={data.total}
        className="md:col-span-2"
      />
    </div>
  );
}
