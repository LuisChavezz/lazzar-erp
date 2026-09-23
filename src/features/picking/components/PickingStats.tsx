"use client";

import { RouteIcon, ClipboardListIcon } from "@/src/components/Icons";
import { KpiCard, type KpiItem } from "@/src/components/KpiGrid";
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
 *
 * El desglose por prioridad (`PickingPriorityBreakdown`) NO usa `KpiGrid`
 * completo a propósito: antes vivía apilado debajo de las dos tarjetas,
 * ocupando una fila propia. Aquí se arma la MISMA grilla a mano
 * (`KpiCard` suelto en vez de `<KpiGrid>`) para que el desglose entre como
 * tercer miembro de la fila (`md:col-span-2`) y quede a la misma altura que
 * "Total de Pickings"/"Líneas por Surtir" en vez de un bloque de dashboard
 * aparte.
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 items-stretch gap-4" role="list">
      {cards.map((item, index) => (
        <KpiCard key={`${item.label}-${index}`} item={item} />
      ))}
      <PickingPriorityBreakdown
        breakdown={kpis.prioridadBreakdown}
        className="md:col-span-2"
      />
    </div>
  );
}
