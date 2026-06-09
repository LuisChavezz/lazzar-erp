"use client";

import { useMemo } from "react";
import KpiGrid, { type KpiItem } from "@/src/components/KpiGrid";
import { WarehouseIcon, LayersIcon, RulerIcon } from "@/src/components/Icons";
import type { LocationDashboardStats } from "../types/location-dashboard.types";

interface LocationStatsProps {
  stats: LocationDashboardStats;
}

export function LocationStats({ stats }: LocationStatsProps) {
  const items: KpiItem[] = useMemo(
    () => [
      {
        label: "Capacidad Total",
        value: `${stats.capacidadTotalPorcentaje}%`,
        icon: WarehouseIcon,
        iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
        iconClass: "text-sky-500",
        trendLabel: `${stats.ubicacionesDisponibles} libres`,
        status: stats.capacidadTotalPorcentaje >= 90 ? "negative" : "positive",
        progress: stats.capacidadTotalPorcentaje,
        subLabel: `${stats.totalUbicaciones} ubicaciones`,
      },
      {
        label: "Ocupación Zona Rollos",
        value: `${stats.ocupacionRollosPorcentaje}%`,
        icon: LayersIcon,
        iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
        iconClass: "text-emerald-500",
        trendLabel: `+${stats.ubicacionesCriticas} críticas`,
        status: stats.ocupacionRollosPorcentaje >= 90 ? "negative" : "positive",
        progress: stats.ocupacionRollosPorcentaje,
      },
      {
        label: "Ocupación Zona Avíos",
        value: `${stats.ocupacionAviosPorcentaje}%`,
        icon: RulerIcon,
        iconBgClass: "bg-violet-50 dark:bg-violet-500/10",
        iconClass: "text-violet-500",
        trendLabel: `${stats.ubicacionesLlenas} llenas`,
        status: stats.ocupacionAviosPorcentaje >= 90 ? "negative" : "positive",
        progress: stats.ocupacionAviosPorcentaje,
      },
    ],
    [stats],
  );

  return <KpiGrid items={items} />;
}
