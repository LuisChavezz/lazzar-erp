"use client";

import { ClipboardListIcon, BoxIcon, WeightIcon, VolumeIcon } from "@/src/components/Icons";
import KpiGrid, { type KpiItem } from "@/src/components/KpiGrid";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { computePackingKpis } from "../utils/packing.utils";
import type { Packing } from "../interfaces/packing.interface";

/**
 * KPIs del listado de Packing, derivados por completo de `Packing[]` ya
 * cargado por `usePackings()` — sin fetch propio. Se gatea
 * `!isLoading && !showError` en el llamador (`PackingView`), mismo patrón que
 * `PickingStats`: sin ese gate, `items` arrancaría en `[]` y las tarjetas
 * mostrarían ceros que se leerían como datos reales durante la carga inicial.
 *
 * `numero_cajas`/`peso_total`/`volumen_total` son captura libre del operador
 * (no derivan de ningún registro real de caja — `PackingCaja` no tiene API):
 * las tarjetas de logística suman EXACTAMENTE lo capturado, sin implicar más
 * precisión o verificación de la que el dato realmente tiene. Por eso los
 * títulos son neutros ("Peso Total", no algo como "Peso Verificado") y no
 * llevan `trendLabel` de status positivo/negativo — no hay un "bien"/"mal"
 * que juzgar sobre una suma de captura libre.
 */
export function PackingStats({ items }: { items: Packing[] }) {
  const kpis = computePackingKpis(items);

  const cards: KpiItem[] = [
    {
      label: "Total de Líneas Empacadas",
      value: String(kpis.totalLineasEmpacadas),
      icon: ClipboardListIcon,
      iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass: "text-emerald-500",
      trendLabel: "Actividad registrada",
      status: "neutral",
    },
    {
      label: "Total de Cajas",
      value: String(kpis.totalCajas),
      icon: BoxIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-500",
      subLabel: "Captura libre del operador",
    },
    {
      label: "Peso Total",
      value: `${formatExactQuantityValue(kpis.pesoTotal)} kg`,
      icon: WeightIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-500",
      subLabel: "Captura libre del operador",
    },
    {
      label: "Volumen Total",
      value: `${formatExactQuantityValue(kpis.volumenTotal)} m³`,
      icon: VolumeIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-500",
      subLabel: "Captura libre del operador",
    },
  ];

  return <KpiGrid items={cards} />;
}
