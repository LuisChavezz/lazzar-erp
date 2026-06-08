"use client";

import { useState, useMemo, useTransition } from "react";
import {
  CloseIcon,
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
  STATUS_CONFIG,
  type StockStatus,
} from "./StockColumns";

// ─── Componente: píldora de filtro ────────────────────────────────────────────

function FilterPill({
  children,
  active,
  activeClass,
  onClick,
  dotColor,
}: {
  children: React.ReactNode;
  active: boolean;
  activeClass?: string;
  onClick: () => void;
  dotColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 shrink-0",
        active
          ? (activeClass ?? "bg-sky-500 text-white shadow-sm shadow-sky-500/30")
          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10",
      ].join(" ")}
    >
      {dotColor && !active && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      )}
      {children}
    </button>
  );
}

// ─── Componente: separador de filtros ────────────────────────────────────────

function FilterDivider() {
  return (
    <span className="hidden sm:block w-px h-4 bg-slate-200 dark:bg-white/10 shrink-0" />
  );
}

// ─── Componente: KPIs calculados sobre datos reales ──────────────────────────

function StockStats({ items, maxStock }: { items: StockViewDataItem[]; maxStock: number }) {
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

// ─── Tipo interno para los filtros ───────────────────────────────────────────

interface StockViewDataItem {
  stock: number;
  almacen_info: { nombre: string | null; codigo: string | null };
  producto_info: { nombre: string | null; sku: string | null };
  ubicacion_info: { nombre_completo: string | null };
  almacen: number;
  ubicacion: number;
  id: number;
  producto_variante: number;
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

  const [selectedWarehouse, setSelectedWarehouse] = useState<number | "all">("all");
  const [selectedStatus,    setSelectedStatus]    = useState<StockStatus | "all">("all");

  const [, startTransition] = useTransition();

  // ── Almacenes únicos para el filtro ──────────────────────────────────────
  const warehouses = useMemo(() => {
    const map = new Map<number, { id: number; nombre: string; codigo: string }>();
    for (const item of stockItems) {
      const info = item.almacen_info;
      if (info && info.id_almacen != null && !map.has(info.id_almacen)) {
        map.set(info.id_almacen, {
          id: info.id_almacen,
          nombre: info.nombre ?? "",
          codigo: info.codigo ?? "",
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [stockItems]);

  // ── Máximo stock para normalizar el anillo ───────────────────────────────
  const maxStock = useMemo(
    () => stockItems.reduce((max, item) => Math.max(max, item.stock), 0),
    [stockItems],
  );

  // ── Columnas con el maxStock calculado ───────────────────────────────────
  const columns = useMemo(() => getStockColumns(maxStock || undefined), [maxStock]);

  // ── Filtros por píldoras ─────────────────────────────────────────────────
  const pillFilteredData = useMemo(() => {
    return stockItems.filter((item) => {
      if (selectedWarehouse !== "all" && item.almacen_info.id_almacen !== selectedWarehouse) {
        return false;
      }
      if (selectedStatus !== "all") {
        const status = getStockStatus(item.stock, maxStock);
        if (status !== selectedStatus) return false;
      }
      return true;
    });
  }, [stockItems, selectedWarehouse, selectedStatus, maxStock]);

  const hasActiveFilters =
    selectedWarehouse !== "all" ||
    selectedStatus    !== "all";

  const clearFilters = () => {
    startTransition(() => {
      setSelectedWarehouse("all");
      setSelectedStatus("all");
    });
  };

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

      {/* ── Panel de filtros ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3 rounded-xl bg-slate-50 dark:bg-white/3 border border-slate-200/60 dark:border-white/6">
        {/* Almacén */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Almacén
          </span>
          <FilterPill
            active={selectedWarehouse === "all"}
            onClick={() => startTransition(() => setSelectedWarehouse("all"))}
          >
            Todos
          </FilterPill>
          {warehouses.map((wh) => (
            <FilterPill
              key={wh.id}
              active={selectedWarehouse === wh.id}
              onClick={() => startTransition(() => setSelectedWarehouse(wh.id))}
            >
              {wh.nombre}
            </FilterPill>
          ))}
        </div>

        <FilterDivider />

        {/* Estado */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Estado
          </span>
          <FilterPill
            active={selectedStatus === "all"}
            onClick={() => startTransition(() => setSelectedStatus("all"))}
          >
            Todos
          </FilterPill>
          {(["full", "ok", "low", "critical"] as StockStatus[]).map((s) => (
            <FilterPill
              key={s}
              active={selectedStatus === s}
              activeClass={STATUS_CONFIG[s].pillActive + " shadow-sm"}
              dotColor={STATUS_CONFIG[s].dot.replace(" animate-pulse", "")}
              onClick={() => startTransition(() => setSelectedStatus(s))}
            >
              {STATUS_CONFIG[s].label}
            </FilterPill>
          ))}
        </div>
      </div>

      {/* ── Botón de limpiar filtros ────────────────────────────────────── */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
          >
            <CloseIcon className="w-3 h-3" />
            Limpiar filtros
          </button>
        </div>
      )}

      {/* ── Tabla de existencias ─────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={pillFilteredData}
        searchPlaceholder="Buscar por producto, SKU o almacén..."
        onRefetch={async () => {
          await refetch();
        }}
        isRefetching={isFetching}
      />
    </div>
  );
}
