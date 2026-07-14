"use client";

import KpiGrid, { type KpiItem } from "@/src/components/KpiGrid";
import {
  TraspasosIcon,
  ClipboardListIcon,
  InventariosIcon,
} from "@/src/components/Icons";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import type { StockMovementReportSummary as StockMovementReportSummaryData } from "@/src/features/stock/interfaces/stock-movement-report.interface";

interface StockMovementReportSummaryProps {
  // `undefined` explícito: el bloque debe degradar (no romper) si el backend
  // llegara a omitir el agregado no paginado `resumen`.
  summary: StockMovementReportSummaryData | undefined;
}

/**
 * Bloque de totales del periodo (campo `resumen`, NO paginado): refleja SIEMPRE
 * el periodo completo, sin importar en qué página de la tabla esté el usuario.
 * No se recalcula desde las filas visibles. Espejo de `StockReportSummary`.
 */
export function StockMovementReportSummary({
  summary,
}: StockMovementReportSummaryProps) {
  // Sin `resumen` no se renderiza el bloque (en vez de romper toda la página al
  // desreferenciar `summary.*`). Igual que otros bloques KPI que devuelven null
  // cuando no hay datos que mostrar.
  if (!summary) return null;

  // Se usa `formatQuantityValue` para los tres: convierte number|string a un
  // número es-MX (los conteos llegan como number; `total_cantidad` como string
  // decimal del backend).
  const items: KpiItem[] = [
    {
      label: "Total Movimientos",
      value: formatQuantityValue(summary.total_movimientos),
      icon: TraspasosIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      status: "neutral",
    },
    {
      label: "Total Registros",
      value: formatQuantityValue(summary.total_registros),
      icon: ClipboardListIcon,
      iconBgClass: "bg-violet-50 dark:bg-violet-500/10",
      iconClass: "text-violet-500",
      status: "neutral",
    },
    {
      label: "Cantidad Total",
      value: formatQuantityValue(summary.total_cantidad),
      icon: InventariosIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-500",
      status: "neutral",
    },
  ];

  return <KpiGrid items={items} />;
}
