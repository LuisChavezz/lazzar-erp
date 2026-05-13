"use client";

import { useState, useMemo, useDeferredValue, useTransition } from "react";
import {
  MapPinIcon,
  BuildingIcon,
  SearchIcon,
  CloseIcon,
  ExistenciasIcon,
  TrendingUpIcon,
  ErrorIcon,
  ProductVariantsIcon,
} from "@/src/components/Icons";
import { SearchInput } from "@/src/components/SearchInput";
import KpiGrid, { type KpiItem } from "@/src/components/KpiGrid";
import {
  MOCK_STOCK_ITEMS,
  WAREHOUSES,
  CATEGORIES,
  type MockStockItem,
  type StockStatus,
  type StockCategory,
} from "../mock/stockMockData";

// ─── Mapas de estilos ────────────────────────────────────────────────────────

/**
 * Color hex del borde izquierdo por categoría.
 * Se aplica como style inline para garantizar que nunca sea sobreescrito
 * por clases de borde global en modo oscuro (ej. dark:border-white/8).
 */
const CATEGORY_BORDER_COLOR: Record<string, string> = {
  Telas:      "#6366f1",  // indigo-500
  Botones:    "#10b981",  // emerald-500
  Cierres:    "#0ea5e9",  // sky-500
  Hilos:      "#8b5cf6",  // violet-500
  Elásticos:  "#f97316",  // orange-500
  Entretelas: "#f59e0b",  // amber-500
  Ribetes:    "#f43f5e",  // rose-500
  Forros:     "#14b8a6",  // teal-500
  Accesorios: "#64748b",  // slate-500
};

const CATEGORY_STYLES: Record<
  string,
  { badge: string; dot: string }
> = {
  Telas:      { badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",     dot: "bg-indigo-500"  },
  Botones:    { badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", dot: "bg-emerald-500" },
  Cierres:    { badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",                dot: "bg-sky-500"     },
  Hilos:      { badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",    dot: "bg-violet-500"  },
  Elásticos:  { badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",    dot: "bg-orange-500"  },
  Entretelas: { badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",        dot: "bg-amber-500"   },
  Ribetes:    { badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",            dot: "bg-rose-500"    },
  Forros:     { badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",            dot: "bg-teal-500"    },
  Accesorios: { badge: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",            dot: "bg-slate-400"   },
};

const WAREHOUSE_STYLES: Record<string, string> = {
  sky:     "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-800/50",
  violet:  "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800/50",
  emerald: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/50",
  rose:    "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800/50",
};

const STATUS_CONFIG: Record<
  StockStatus,
  { label: string; dot: string; textClass: string; pillActive: string }
> = {
  full:     { label: "Óptimo",  dot: "bg-emerald-500",              textClass: "text-emerald-600 dark:text-emerald-400", pillActive: "bg-emerald-500 text-white shadow-emerald-500/30" },
  ok:       { label: "Normal",  dot: "bg-sky-500",                  textClass: "text-sky-600 dark:text-sky-400",         pillActive: "bg-sky-500 text-white shadow-sky-500/30"         },
  low:      { label: "Bajo",    dot: "bg-amber-500",                textClass: "text-amber-600 dark:text-amber-400",     pillActive: "bg-amber-500 text-white shadow-amber-500/30"     },
  critical: { label: "Crítico", dot: "bg-red-500 animate-pulse",   textClass: "text-red-600 dark:text-red-400",         pillActive: "bg-red-500 text-white shadow-red-500/30"         },
};

// ─── Componente: Anillo de stock (SVG donut) ──────────────────────────────────

interface StockRingProps {
  total: number;
  apartado: number;
  max: number;
  status: StockStatus;
}

/** Anillo donut SVG con dos segmentos: disponible (azul) y apartado (ámbar). */
function StockRing({ total, apartado, max, status }: StockRingProps) {
  const SIZE = 78;
  const R    = 29;
  const SW   = 7;
  const C    = 2 * Math.PI * R;
  const CX   = SIZE / 2;
  const CY   = SIZE / 2;

  const disponible  = Math.max(0, total - apartado);
  const pctDisp     = Math.min(disponible / max, 1);
  const pctApart    = Math.min(apartado / max, 1);
  const pctTotal    = Math.min(total / max, 1);

  const dispLen     = C * pctDisp;
  const apartLen    = C * pctApart;

  // Ángulo de inicio de cada arco (en grados, partiendo desde las 12h = -90°)
  const dispStartDeg  = -90;
  const apartStartDeg = -90 + pctDisp * 360;

  const percentage = Math.round(pctTotal * 100);

  const centerFillClass: Record<StockStatus, string> = {
    full:     "fill-emerald-500",
    ok:       "fill-sky-500",
    low:      "fill-amber-500",
    critical: "fill-red-500",
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-hidden="true"
        role="img"
      >
        {/* Pista de fondo */}
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          strokeWidth={SW}
          className="stroke-slate-100 dark:stroke-white/10"
        />

        {/* Arco: disponible (azul cielo) */}
        {pctDisp > 0.005 && (
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            strokeWidth={SW}
            stroke="#0ea5e9"
            strokeDasharray={`${dispLen} ${C}`}
            strokeLinecap="butt"
            style={{
              transform: `rotate(${dispStartDeg}deg)`,
              transformOrigin: `${CX}px ${CY}px`,
            }}
          />
        )}

        {/* Arco: apartado (ámbar) */}
        {pctApart > 0.005 && (
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            strokeWidth={SW}
            stroke="#fbbf24"
            strokeDasharray={`${apartLen} ${C}`}
            strokeLinecap="butt"
            style={{
              transform: `rotate(${apartStartDeg}deg)`,
              transformOrigin: `${CX}px ${CY}px`,
            }}
          />
        )}

        {/* Porcentaje central */}
        <text
          x={CX}
          y={CY + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={12}
          fontWeight={700}
          className={centerFillClass[status]}
        >
          {percentage}%
        </text>
      </svg>

      <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 tracking-widest uppercase">
        stock
      </span>
    </div>
  );
}

// ─── Componente: ítem de leyenda ──────────────────────────────────────────────

function LegendItem({
  color,
  label,
  value,
  unit,
}: {
  color: string;
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
      <div className="min-w-0">
        <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-none uppercase tracking-wide">
          {label}
        </span>
        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 block leading-tight truncate">
          {value.toLocaleString("es-MX")}&nbsp;{unit}
        </span>
      </div>
    </div>
  );
}

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

// ─── Componente: tarjeta de existencia ───────────────────────────────────────

function StockCard({ item }: { item: MockStockItem }) {
  const catStyle   = CATEGORY_STYLES[item.categoria] ?? CATEGORY_STYLES["Accesorios"];
  const whStyle    = WAREHOUSE_STYLES[item.almacen.colorKey];
  const statusCfg  = STATUS_CONFIG[item.status];
  const disponible = item.cantidadTotal - item.cantidadApartada;
  // El color del borde se aplica como style inline para garantizar que
  // dark:border-white/8 (borde general) no lo sobreescriba en modo oscuro.
  const borderColor = CATEGORY_BORDER_COLOR[item.categoria] ?? "#64748b";

  return (
    <article
      style={{ borderLeftColor: borderColor }}
      className={[
        "group relative flex flex-col",
        "bg-white dark:bg-slate-900",
        "rounded-2xl border border-slate-200/80 dark:border-white/8",
        "border-l-4",
        "shadow-sm hover:shadow-lg dark:hover:shadow-slate-950/60",
        "transition-all duration-200 hover:-translate-y-0.5",
        "overflow-hidden",
      ].join(" ")}
    >
      {/* Cabecera: categoría + almacén */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2 gap-2">
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full leading-none ${catStyle.badge}`}
        >
          {item.categoria}
        </span>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full leading-none ${whStyle}`}
        >
          {item.almacen.id}
        </span>
      </div>

      {/* Cuerpo principal: info + anillo */}
      <div className="flex items-start gap-3 px-4 pb-3 flex-1">
        {/* Columna izquierda: información del producto */}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">
            {item.nombre}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono tracking-wider">
            {item.sku}
          </p>

          <div className="mt-2 space-y-0.5">
            <p className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <BuildingIcon className="w-3 h-3 shrink-0 text-slate-400" />
              <span className="truncate">{item.almacen.nombre} · {item.almacen.ciudad}</span>
            </p>
            <p className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
              <MapPinIcon className="w-3 h-3 shrink-0" />
              <span className="truncate">{item.ubicacion}</span>
            </p>
          </div>
        </div>

        {/* Columna derecha: anillo donut */}
        <div className="shrink-0 pt-1">
          <StockRing
            total={item.cantidadTotal}
            apartado={item.cantidadApartada}
            max={item.capacidadMaxima}
            status={item.status}
          />
        </div>
      </div>

      {/* Pie: leyenda de cantidades + badge de estado */}
      <div className="border-t border-slate-100 dark:border-white/6 px-4 py-2.5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/1.5">
        <LegendItem
          color="bg-sky-500"
          label="Disponible"
          value={disponible}
          unit={item.unidad}
        />

        {item.cantidadApartada > 0 && (
          <LegendItem
            color="bg-amber-400"
            label="Apartado"
            value={item.cantidadApartada}
            unit={item.unidad}
          />
        )}

        {/* Estado */}
        <div className="ml-auto flex items-center gap-1 shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
          <span className={`text-[10px] font-semibold ${statusCfg.textClass}`}>
            {statusCfg.label}
          </span>
        </div>
      </div>
    </article>
  );
}

// ─── Componente: estado vacío ─────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
        <SearchIcon className="w-6 h-6 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
        Sin resultados
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
        No hay existencias que coincidan con los filtros aplicados.
      </p>
    </div>
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
  const totalCapacidad = MOCK_STOCK_ITEMS.reduce(
    (acc, item) => acc + item.capacidadMaxima,
    0
  );
  const criticos       = MOCK_STOCK_ITEMS.filter((i) => i.status === "critical").length;
  const nivelServicio  = Math.round((totalDisponible / totalCapacidad) * 100);

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
      label:       "Unidades Disponibles",
      value:       totalDisponible.toLocaleString("es-MX"),
      icon:        TrendingUpIcon,
      iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass:   "text-emerald-500",
      trendLabel:  `${nivelServicio}% de cap.`,
      status:      "positive",
      progress:    nivelServicio,
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
    {
      label:       "Artículos Críticos",
      value:       criticos.toString(),
      icon:        ErrorIcon,
      iconBgClass: "bg-red-50 dark:bg-red-500/10",
      iconClass:   "text-red-500",
      trendLabel:  `de ${MOCK_STOCK_ITEMS.length} SKUs`,
      status:      criticos > 0 ? "negative" : "positive",
      progress:    Math.round((criticos / MOCK_STOCK_ITEMS.length) * 100),
    },
  ];

  return <KpiGrid items={kpis} />;
}

// ─── Vista principal de existencias (mock) ───────────────────────────────────

/**
 * Vista de existencias con datos ficticios de manufactura textil.
 * Incluye KPIs, buscador, filtros por almacén / categoría / estado y grid de tarjetas.
 * Usa `useDeferredValue` para mantener la UI responsiva durante el filtrado.
 */
export function StockMockView() {
  const [searchQuery,       setSearchQuery]       = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [selectedCategory,  setSelectedCategory]  = useState<string>("all");
  const [selectedStatus,    setSelectedStatus]    = useState<StockStatus | "all">("all");

  const [, startTransition] = useTransition();

  // Búsqueda diferida: el input se actualiza de inmediato; el filtrado usa la
  // versión deferred para no bloquear la UI (patrón React 19 concurrent).
  const deferredSearch = useDeferredValue(searchQuery);

  const filteredItems = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    return MOCK_STOCK_ITEMS.filter((item) => {
      if (
        q &&
        !item.nombre.toLowerCase().includes(q) &&
        !item.sku.toLowerCase().includes(q) &&
        !item.almacen.nombre.toLowerCase().includes(q) &&
        !item.categoria.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (selectedWarehouse !== "all" && item.almacen.id !== selectedWarehouse) return false;
      if (selectedCategory  !== "all" && item.categoria   !== selectedCategory)  return false;
      if (selectedStatus    !== "all" && item.status       !== selectedStatus)    return false;
      return true;
    });
  }, [deferredSearch, selectedWarehouse, selectedCategory, selectedStatus]);

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

      {/* ── Barra de búsqueda y contador ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Buscar por producto, SKU o almacén..."
          className="w-full sm:max-w-sm"
        />

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {filteredItems.length}
            </span>{" "}
            existencias
          </span>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
            >
              <CloseIcon className="w-3 h-3" />
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

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

      {/* ── Grid de tarjetas ─────────────────────────────────────────────── */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <StockCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
