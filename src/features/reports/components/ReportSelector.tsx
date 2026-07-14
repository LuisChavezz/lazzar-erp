"use client";

import type { ComponentType } from "react";
import TiltCard from "@/src/components/TiltCard";
import { ExistenciasIcon, HistoryIcon } from "@/src/components/Icons";

/** Identificador de cada reporte disponible. Sumar uno = una entrada más abajo. */
export type ReportId = "existencias" | "movimientos";

interface ReportDefinition {
  id: ReportId;
  label: string;
  description: string;
  footerText: string;
  icon: ComponentType<{ className?: string }>;
  accentClass: string;
  accentBgClass: string;
  shadowColorClassName: string;
}

// La lista de reportes vive como DATOS: agregar un reporte nuevo es una entrada
// más en este arreglo (no marcado JSX duplicado). Hoy solo existe el de
// existencias. Mismo patrón que `configGroups` / `homeCards`.
const REPORTS: ReportDefinition[] = [
  {
    id: "existencias",
    label: "Reporte de Existencias",
    description:
      "Consulta entradas, salidas y existencias por almacén y periodo.",
    footerText: "Generar reporte",
    icon: ExistenciasIcon,
    accentClass: "text-sky-600 dark:text-sky-400",
    accentBgClass: "bg-sky-50 dark:bg-sky-500/10",
    shadowColorClassName: "hover:shadow-sky-500/25 dark:hover:shadow-sky-500/25",
  },
  {
    id: "movimientos",
    label: "Reporte de Movimientos de Inventario",
    description:
      "Consulta entradas, salidas y ajustes registrados por periodo.",
    footerText: "Generar reporte",
    icon: HistoryIcon,
    accentClass: "text-violet-600 dark:text-violet-400",
    accentBgClass: "bg-violet-50 dark:bg-violet-500/10",
    shadowColorClassName:
      "hover:shadow-violet-500/25 dark:hover:shadow-violet-500/25",
  },
];

const cardClassName =
  "cursor-pointer rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-6 sm:p-8 h-full";

interface ReportSelectorProps {
  onSelectReport: (id: ReportId) => void;
}

/**
 * Menú de reportes: el usuario elige QUÉ reporte ver antes de entrar a su flujo
 * (gate + tabla + export). Réplica del patrón de selección de `ConfigContent`
 * (TiltCard con `onClick` + grilla), con la lista como datos para que sumar
 * reportes sea trivial.
 */
export function ReportSelector({ onSelectReport }: ReportSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
      {REPORTS.map((report) => (
        <TiltCard
          key={report.id}
          onClick={() => onSelectReport(report.id)}
          icon={report.icon}
          title={report.label}
          description={report.description}
          footerText={report.footerText}
          accentClass={report.accentClass}
          accentBgClass={report.accentBgClass}
          shadowColorClassName={report.shadowColorClassName}
          className={cardClassName}
        />
      ))}
    </div>
  );
}
