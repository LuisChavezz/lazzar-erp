"use client";

import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { MapPinIcon, BuildingIcon } from "@/src/components/Icons";
import {
  type MockStockItem,
  type StockStatus,
} from "../mock/stockMockData";

// ─── Mapas de estilos ────────────────────────────────────────────────────────

export const CATEGORY_STYLES: Record<
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

export const WAREHOUSE_STYLES: Record<string, string> = {
  sky:     "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-800/50",
  violet:  "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800/50",
  emerald: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/50",
  rose:    "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800/50",
};

export const STATUS_CONFIG: Record<
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

// ─── Columnas de la tabla ────────────────────────────────────────────────────

const columnHelper = createColumnHelper<MockStockItem>();

/**
 * Retorna las columnas configuradas para la tabla de existencias (mock).
 * Se define como función para mantener compatibilidad con la inferencia
 * de tipos de TanStack Table (mismo patrón que `getColumns` en otras vistas del ERP).
 */
export function getStockColumns(): ColumnDef<MockStockItem>[] {
  return [
  columnHelper.accessor((row) => `${row.nombre} ${row.sku}`, {
    id: "producto",
    header: "Producto",
    meta: { label: "Producto" } as const,
    cell: (info) => {
      const item = info.row.original;
      return (
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">
            {item.nombre}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono tracking-wider">
            {item.sku}
          </p>
        </div>
      );
    },
  }),
  columnHelper.accessor("categoria", {
    id: "categoria",
    header: "Categoría",
    meta: { label: "Categoría" } as const,
    cell: (info) => {
      const cat = info.getValue();
      const style = CATEGORY_STYLES[cat] ?? CATEGORY_STYLES["Accesorios"];
      return (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full leading-none ${style.badge}`}>
          {cat}
        </span>
      );
    },
  }),
  columnHelper.accessor("almacen", {
    id: "almacen",
    header: "Almacén",
    meta: { label: "Almacén" } as const,
    cell: (info) => {
      const wh = info.getValue();
      const whStyle = WAREHOUSE_STYLES[wh.colorKey];
      return (
        <div className="min-w-0">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full leading-none ${whStyle}`}>
            {wh.id}
          </span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <BuildingIcon className="w-3 h-3 shrink-0 text-slate-400" />
            <span className="truncate">{wh.nombre} · {wh.ciudad}</span>
          </p>
        </div>
      );
    },
  }),
  columnHelper.accessor("ubicacion", {
    id: "ubicacion",
    header: "Ubicación",
    meta: { label: "Ubicación" } as const,
    cell: (info) => (
      <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
        <MapPinIcon className="w-3 h-3 shrink-0" />
        <span className="truncate">{info.getValue()}</span>
      </div>
    ),
  }),
  columnHelper.accessor("cantidadTotal", {
    id: "stock",
    header: "Stock",
    meta: { label: "Stock" } as const,
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.cantidadTotal / rowA.original.capacidadMaxima;
      const b = rowB.original.cantidadTotal / rowB.original.capacidadMaxima;
      return a - b;
    },
    cell: (info) => {
      const item = info.row.original;
      return (
        <StockRing
          total={item.cantidadTotal}
          apartado={item.cantidadApartada}
          max={item.capacidadMaxima}
          status={item.status}
        />
      );
    },
  }),
  columnHelper.accessor(
    (row) => Math.max(0, row.cantidadTotal - row.cantidadApartada),
    {
      id: "disponible",
      header: "Disponible",
      meta: { label: "Disponible" } as const,
      sortingFn: "basic",
      cell: (info) => {
        const item = info.row.original;
        const disponible = Math.max(0, item.cantidadTotal - item.cantidadApartada);
        return (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0 bg-sky-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {disponible.toLocaleString("es-MX")}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              {item.unidad}
            </span>
          </div>
        );
      },
    }
  ),
  columnHelper.accessor("cantidadApartada", {
    id: "apartado",
    header: "Apartado",
    meta: { label: "Apartado" } as const,
    sortingFn: "basic",
    cell: (info) => {
      const item = info.row.original;
      if (item.cantidadApartada <= 0) {
        return (
          <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
        );
      }
      return (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0 bg-amber-400" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {item.cantidadApartada.toLocaleString("es-MX")}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {item.unidad}
          </span>
        </div>
      );
    },
  }),
  columnHelper.display({
    id: "estado",
    header: "Estado",
    meta: { label: "Estado" } as const,
    cell: (info) => {
      const status = info.row.original.status;
      const cfg = STATUS_CONFIG[status];
      return (
        <div className="flex items-center gap-1 shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          <span className={`text-[10px] font-semibold ${cfg.textClass}`}>
            {cfg.label}
          </span>
        </div>
      );
    },
  }),
] as ColumnDef<MockStockItem>[];
}
