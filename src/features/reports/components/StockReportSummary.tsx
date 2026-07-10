"use client";

import KpiGrid, { type KpiItem } from "@/src/components/KpiGrid";
import {
  ExistenciasIcon,
  PackageCheckIcon,
  PackageXIcon,
  InventariosIcon,
  ListaPreciosIcon,
} from "@/src/components/Icons";
import {
  formatMoneyValue,
  formatQuantityValue,
} from "@/src/utils/formatCurrency";
import type { StockReportSummary as StockReportSummaryData } from "@/src/features/stock/interfaces/stock-report.interface";

interface StockReportSummaryProps {
  // `undefined` explícito: el bloque debe degradar (no romper) si el backend
  // llegara a omitir el agregado no paginado `resumen`.
  summary: StockReportSummaryData | undefined;
}

/**
 * Bloque de totales del periodo (campo `resumen`, NO paginado): refleja SIEMPRE
 * el periodo completo, sin importar en qué página de la tabla esté el usuario.
 * No se recalcula desde las filas visibles.
 *
 * `resumen_por_almacen` se omite a propósito: con la selección de un único
 * almacén (gate actual) es redundante con `resumen` (una sola entrada, idéntica
 * salvo la identidad del almacén). Si el gate llega a soportar multi-almacén,
 * aquí es donde se añadiría ese desglose.
 */
export function StockReportSummary({ summary }: StockReportSummaryProps) {
  // Sin `resumen` no se renderiza el bloque (en vez de romper toda la página al
  // desreferenciar `summary.*`). Igual que otros bloques KPI que devuelven null
  // cuando no hay datos que mostrar.
  if (!summary) return null;

  const items: KpiItem[] = [
    {
      label: "Existencia Inicial",
      value: formatQuantityValue(summary.existencia_inicial),
      icon: ExistenciasIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      status: "neutral",
    },
    {
      label: "Entradas",
      value: formatQuantityValue(summary.entradas),
      icon: PackageCheckIcon,
      iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass: "text-emerald-500",
      status: "positive",
    },
    {
      label: "Salidas",
      value: formatQuantityValue(summary.salidas),
      icon: PackageXIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-500",
      status: "neutral",
    },
    {
      label: "Existencia Final",
      value: formatQuantityValue(summary.existencia_final),
      icon: InventariosIcon,
      iconBgClass: "bg-violet-50 dark:bg-violet-500/10",
      iconClass: "text-violet-500",
      status: "neutral",
    },
    {
      label: "Costo Total",
      value: formatMoneyValue(summary.costo_total_existencia_final),
      icon: ListaPreciosIcon,
      iconBgClass: "bg-blue-50 dark:bg-blue-500/10",
      iconClass: "text-blue-500",
      status: "neutral",
    },
  ];

  return <KpiGrid items={items} />;
}
