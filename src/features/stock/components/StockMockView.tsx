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
import {
  MOCK_STOCK_ITEMS,
  WAREHOUSES,
  CATEGORIES,
  type StockStatus,
  type StockCategory,
} from "../mock/stockMockData";
import { getStockColumns, CATEGORY_STYLES, STATUS_CONFIG } from "./StockMockColumns";

// ─── Mapas de estilos (definidos en StockMockColumns) ─────────────────────────

// ─── Columnas de la tabla (definidas en StockMockColumns) ─────────────────────

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

// ─── Componente: KPIs calculados sobre la mock-data ──────────────────────────

/**
 * Reemplaza a StockStats con métricas calculadas en tiempo real
 * a partir de MOCK_STOCK_ITEMS (datos ficticios de manufactura textil).
 */
function StockMockStats() {
  const totalDisponible = MOCK_STOCK_ITEMS.reduce(
    (acc, item) => acc + (item.cantidadTotal - item.cantidadApartada),
    0
  );
  const totalApartado = MOCK_STOCK_ITEMS.reduce(
    (acc, item) => acc + item.cantidadApartada,
    0
  );
  const requiereStock   = MOCK_STOCK_ITEMS.filter(
    (i) => i.status === "low" || i.status === "critical"
  ).length;
  const pctRequiereStock = Math.round((requiereStock / MOCK_STOCK_ITEMS.length) * 100);

  const kpis: KpiItem[] = [
    {
      label:       "SKUs en Existencia",
      value:       MOCK_STOCK_ITEMS.length.toString(),
      icon:        ExistenciasIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass:   "text-sky-500",
      trendLabel:  `${CATEGORIES.length} categorías`,
      status:      "positive",
      progress:    100,
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
      label:       "Unidades Apartadas",
      value:       totalApartado.toLocaleString("es-MX"),
      icon:        ProductVariantsIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass:   "text-amber-500",
      trendLabel:  `${Math.round((totalApartado / (totalDisponible + totalApartado)) * 100)}% del total`,
      status:      "neutral",
      progress:    Math.round((totalApartado / (totalDisponible + totalApartado)) * 100),
    },
  ];

  return <KpiGrid items={kpis} />;
}

// ─── Vista principal de existencias (mock) ───────────────────────────────────

/**
 * Vista de existencias con datos ficticios de manufactura textil.
 * Incluye KPIs, filtros por almacén / categoría / estado y tabla de datos.
 * El buscador interno y la paginación los gestiona `DataTable`.
 */
export function StockMockView() {
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [selectedCategory,  setSelectedCategory]  = useState<string>("all");
  const [selectedStatus,    setSelectedStatus]    = useState<StockStatus | "all">("all");

  const [, startTransition] = useTransition();

  // Los filtros por píldoras se aplican primero; el buscador textual lo maneja DataTable.
  const pillFilteredData = useMemo(() => {
    return MOCK_STOCK_ITEMS.filter((item) => {
      if (selectedWarehouse !== "all" && item.almacen.id !== selectedWarehouse) return false;
      if (selectedCategory  !== "all" && item.categoria   !== selectedCategory)  return false;
      if (selectedStatus    !== "all" && item.status       !== selectedStatus)    return false;
      return true;
    });
  }, [selectedWarehouse, selectedCategory, selectedStatus]);

  const hasActiveFilters =
    selectedWarehouse !== "all" ||
    selectedCategory  !== "all" ||
    selectedStatus    !== "all";

  const clearFilters = () => {
    startTransition(() => {
      setSelectedWarehouse("all");
      setSelectedCategory("all");
      setSelectedStatus("all");
    });
  };

  return (
    <div className="space-y-6">
      {/* ── KPIs calculados sobre mock-data ──────────────────────────────── */}
      <StockMockStats />

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
          {WAREHOUSES.map((wh) => (
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

        <FilterDivider />

        {/* Categoría */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Categoría
          </span>
          <FilterPill
            active={selectedCategory === "all"}
            onClick={() => startTransition(() => setSelectedCategory("all"))}
          >
            Todas
          </FilterPill>
          {CATEGORIES.map((cat: StockCategory) => (
            <FilterPill
              key={cat}
              active={selectedCategory === cat}
              dotColor={CATEGORY_STYLES[cat]?.dot}
              onClick={() => startTransition(() => setSelectedCategory(cat))}
            >
              {cat}
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
        columns={getStockColumns()}
        data={pillFilteredData}
        searchPlaceholder="Buscar por producto, SKU o almacén..."
      />
    </div>
  );
}
