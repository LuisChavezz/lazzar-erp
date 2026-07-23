"use client";

import { RouteIcon, ClipboardListIcon } from "@/src/components/Icons";
import KpiGrid, { type KpiItem } from "@/src/components/KpiGrid";
import { computePickingKpis } from "../utils/picking.utils";
import { PickingPriorityBreakdown } from "./PickingPriorityBreakdown";
import type { Picking } from "../interfaces/picking.interface";

/**
 * KPIs del listado de Picking, derivados por completo de `Picking[]` ya
 * cargado por `usePickings()` — sin fetch propio. `estado` se deja fuera a
 * propósito: hoy todo picking nace `"Pendiente"` (no existen endpoints de
 * transición), así que un desglose por estatus sería siempre 100%/0% y no
 * aportaría información real.
 *
 * Se gatea `!isLoading && !isError` en el llamador (`PickingView`), mismo
 * patrón que `OrderStats` (`PurchaseOrderView`): sin ese gate, `items`
 * arrancaría en `[]` y las tarjetas mostrarían ceros que se leerían como datos
 * reales durante la carga inicial.
 */
export function PickingStats({ items }: { items: Picking[] }) {
  const kpis = computePickingKpis(items);

  const cards: KpiItem[] = [
    {
      label: "Total de Pickings",
      value: String(kpis.totalPickings),
      icon: RouteIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      trendLabel: "Listado cargado",
      status: "neutral",
    },
    {
      label: "Líneas por Surtir",
      value: String(kpis.lineasPorSurtir),
      icon: ClipboardListIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-500",
      trendLabel: "Trabajo pendiente",
      status: kpis.lineasPorSurtir > 0 ? "negative" : "positive",
    },
  ];

  return (
    <div className="space-y-4">
      <KpiGrid items={cards} />
      <PickingPriorityBreakdown breakdown={kpis.prioridadBreakdown} />
    </div>
  );
}
