"use client";

import { useMemo, useState } from "react";
import {
  ExistenciasIcon,
  ErrorIcon,
  ProductVariantsIcon,
} from "@/src/components/Icons";
import { DataTable } from "@/src/components/DataTable";
import KpiGrid, { type KpiItem } from "@/src/components/KpiGrid";
import { useStockItems } from "../hooks/useStockItems";
import {
  getStockColumns,
  getStockStatus,
} from "./StockColumns";
import { SkuInfoDialog } from "./SkuInfoDialog";
import type { StockItem } from "../interfaces/stock.interface";
import {
  enrichStockWithStatus,
  createStockFilterConfig,
} from "./StockFilter";



// ─── Componente: KPIs calculados sobre datos reales ──────────────────────────

function StockStats({ items, maxStock }: { items: StockItem[]; maxStock: number }) {
  const skusEnExistencia = items.filter((i) => i.stock > 0).length;
  const requiereStock    = items.filter(
    (i) => {
      const status = getStockStatus(i.stock, maxStock);
      return status === "low" || status === "critical";
    }
  ).length;
  const totalStock       = items.reduce((acc, i) => acc + i.stock, 0);

  const pctRequiereStock = items.length > 0
    ? Math.round((requiereStock / items.length) * 100)
    : 0;

  const kpis: KpiItem[] = [
    {
      label:       "SKUs en Existencia",
      value:       skusEnExistencia.toString(),
      icon:        ExistenciasIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass:   "text-sky-500",
      trendLabel:  `${Math.round((skusEnExistencia / items.length) * 100)}% del total`,
      status:      "positive",
      progress:    items.length > 0 ? Math.round((skusEnExistencia / items.length) * 100) : 0,
    },
    {
      label:       "Requiere Stock",
      value:       requiereStock.toString(),
      icon:        ErrorIcon,
      iconBgClass: "bg-red-50 dark:bg-red-500/10",
      iconClass:   "text-red-500",
      trendLabel:  `${pctRequiereStock}% del total`,
      status:      "negative",
      progress:    pctRequiereStock,
    },
    {
      label:       "Total en Inventario",
      value:       totalStock.toLocaleString("es-MX"),
      icon:        ProductVariantsIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass:   "text-amber-500",
      trendLabel:  `${items.length} registros`,
      status:      "neutral",
      progress:    100,
    },
  ];

  return <KpiGrid items={kpis} />;
}



// ─── Vista principal de existencias ──────────────────────────────────────────

/**
 * Vista de existencias con datos obtenidos de la API.
 * Incluye KPIs, filtros por almacén / categoría / estado y tabla de datos.
 * El buscador interno y la paginación los gestiona `DataTable`.
 */
export function StockView() {
  const {
    data: stockItems = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useStockItems();

  // ── Diálogo de información del SKU (renderizado fuera de la tabla; ver
  // `SkuColumnHeader` en StockColumns.tsx para el motivo) ──────────────────
  const [skuInfoOpen, setSkuInfoOpen] = useState(false);

  // ── Máximo stock para normalizar el anillo ───────────────────────────────
  const maxStock = useMemo(
    () => stockItems.reduce((max, item) => Math.max(max, item.stock), 0),
    [stockItems],
  );

  // ── Columnas con el maxStock calculado ───────────────────────────────────
  const columns = useMemo(
    () => getStockColumns(maxStock || undefined, () => setSkuInfoOpen(true)),
    [maxStock],
  );

  // ── Datos enriquecidos con estado computado para filtros ─────────────────
  const enrichedData = useMemo(
    () => enrichStockWithStatus(stockItems, maxStock),
    [stockItems, maxStock],
  );

  // ── Configuración de filtros para DataTable ─────────────────────────────
  const stockFilterConfig = useMemo(
    () => createStockFilterConfig(stockItems),
    [stockItems],
  );

  // ── Estados de carga y error ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
        <span className="ml-3 text-sm text-slate-500">Cargando existencias...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">
          Error al cargar existencias
        </p>
        <p className="text-xs text-red-500 dark:text-red-300 mt-1">
          {(error as Error).message}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── KPIs calculados sobre datos reales ───────────────────────────── */}
      <StockStats items={stockItems} maxStock={maxStock} />

      {/* ── Tabla de existencias ─────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={enrichedData}
        searchPlaceholder="Buscar por producto, SKU o almacén..."
        filterConfig={stockFilterConfig}
        onRefetch={async () => {
          await refetch();
        }}
        isRefetching={isFetching}
      />

      <SkuInfoDialog open={skuInfoOpen} onOpenChange={setSkuInfoOpen} />
    </div>
  );
}
