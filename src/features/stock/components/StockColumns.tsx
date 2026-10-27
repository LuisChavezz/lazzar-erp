"use client";

import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { InfoIcon, MapPinIcon } from "@/src/components/Icons";
import { ColumnHeaderFilter, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import {
  ALL_FILTER_OPTION,
  matchesMonthFilter,
  matchesRangeFilter,
  type RangeFilterOption,
} from "@/src/utils/columnFilterOptions";
import type { StockFilterOptions } from "./StockFilter";
import { StockItem } from "../interfaces/stock.interface";
import { colorToHex } from "./stock-colors";

// ─── Tipos de estado de stock ─────────────────────────────────────────────────

export type StockStatus = "full" | "ok" | "low" | "critical";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Determina el estado de stock según el porcentaje respecto al máximo del conjunto.
 *
 * Rangos (basados en la leyenda de la UI):
 *   >80%  → Óptimo  (full)
 *   >40%  → Normal  (ok)
 *   >15%  → Bajo    (low)
 *   0–15% → Crítico (critical)
 */
export function getStockStatus(stock: number, maxStock: number): StockStatus {
  const pct = maxStock > 0 ? stock / maxStock : 0;
  if (pct > 0.8)  return "full";
  if (pct > 0.4)  return "ok";
  if (pct > 0.15) return "low";
  return "critical";
}

// ─── Mapas de estilos ────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<
  StockStatus,
  { label: string; dot: string; textClass: string; pillActive: string }
> = {
  full:     { label: "Óptimo",  dot: "bg-emerald-500",              textClass: "text-emerald-600 dark:text-emerald-400", pillActive: "bg-emerald-500 text-white shadow-emerald-500/30" },
  ok:       { label: "Normal",  dot: "bg-sky-500",                  textClass: "text-sky-600 dark:text-sky-400",         pillActive: "bg-sky-500 text-white shadow-sky-500/30"         },
  low:      { label: "Bajo",    dot: "bg-amber-500",                textClass: "text-amber-600 dark:text-amber-400",     pillActive: "bg-amber-500 text-white shadow-amber-500/30"     },
  critical: { label: "Crítico", dot: "bg-red-500 animate-pulse",   textClass: "text-red-600 dark:text-red-400",         pillActive: "bg-red-500 text-white shadow-red-500/30"         },
};


// ─── Filtros de encabezado ───────────────────────────────────────────────────

/** Rangos del filtro de Existencias (piezas disponibles). */
const EXISTENCIAS_RANGES: RangeFilterOption[] = [
  { value: "cero", label: "Sin existencias", max: 1 },
  { value: "1-10", label: "1 a 10", min: 1, max: 11 },
  { value: "11-100", label: "11 a 100", min: 11, max: 101 },
  { value: "mas-100", label: "Más de 100", min: 101 },
];

const EXISTENCIAS_FILTER_OPTIONS: ColumnFilterOption[] = [
  ALL_FILTER_OPTION,
  ...EXISTENCIAS_RANGES.map(({ value, label }) => ({ value, label })),
];

const ESTADO_FILTER_OPTIONS: ColumnFilterOption[] = [
  ALL_FILTER_OPTION,
  ...(Object.keys(STATUS_CONFIG) as StockStatus[]).map((status) => ({
    value: status,
    label: STATUS_CONFIG[status].label,
    dotClassName: STATUS_CONFIG[status].dot,
  })),
];

/** Filtro exacto sobre un campo crudo de la fila (no sobre lo que pinta la celda). */
const exactFilter =
  (pick: (row: StockItem) => string | number | null | undefined) =>
  (row: { original: StockItem }, _columnId: string, filterValue: string | undefined) =>
    !filterValue || String(pick(row.original) ?? "") === filterValue;

function FilterHeader({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span>{title}</span>
      {children}
    </div>
  );
}

const EMPTY_FILTER_OPTIONS: StockFilterOptions = {
  productos: [],
  tipos: [],
  colores: [],
  ubicaciones: [],
  meses: [],
};

// ─── Encabezado de columna SKU ───────────────────────────────────────────────

/**
 * Encabezado de la columna "SKU" con un ícono de información. El diálogo
 * explicativo.
 */
function SkuColumnHeader({ onInfoClick }: { onInfoClick?: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <span>SKU</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onInfoClick?.();
        }}
        onKeyDown={(e) => e.stopPropagation()}
        className="rounded p-0.5 text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/50"
        aria-label="Información sobre el formato de SKU"
      >
        <InfoIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Columnas de la tabla ────────────────────────────────────────────────────

const columnHelper = createColumnHelper<StockItem>();

/**
 * Máximo global usado para normalizar el anillo de stock.
 * Se calcula externamente y se pasa como metadato; por defecto usa 1000.
 */
const DEFAULT_MAX_STOCK = 1000;

/**
 * Retorna las columnas configuradas para la tabla de existencias.
 * Recibe el valor máximo de stock del conjunto de datos para escalar los anillos
 * y un callback opcional que el componente padre usa para abrir el diálogo de
 * información del SKU (ver `SkuColumnHeader` para el motivo de este diseño).
 */
export function getStockColumns(
  maxStock?: number,
  onSkuInfoClick?: () => void,
  filterOptions: StockFilterOptions = EMPTY_FILTER_OPTIONS,
) {
  const effectiveMax = maxStock ?? DEFAULT_MAX_STOCK;

  return [
    columnHelper.accessor(
      (row) => row.producto_info.sku,
      {
        id: "sku",
        header: () => <SkuColumnHeader onInfoClick={onSkuInfoClick} />,
        meta: { label: "SKU" } as const,
        cell: (info) => {
          const sku = info.getValue();
          return sku ? (
            <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
              {sku}
            </span>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-600">—</span>
          );
        },
      }
    ),
    columnHelper.accessor(
      (row) => row.producto_info.nombre ?? "",
      {
        id: "producto",
        header: ({ column }) => (
          <FilterHeader title="Producto">
            <ColumnHeaderFilter
              column={column}
              options={[ALL_FILTER_OPTION, ...filterOptions.productos]}
              label="producto"
              searchable={{ placeholder: "Buscar producto…" }}
            />
          </FilterHeader>
        ),
        filterFn: exactFilter((row) => row.producto_info.nombre),
        meta: { label: "Producto" } as const,
        cell: (info) => (
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">
            {info.getValue()}
          </span>
        ),
      }
    ),
    columnHelper.accessor(
      (row) => row.producto_info.tipo,
      {
        id: "tipo",
        header: ({ column }) => (
          <FilterHeader title="Tipo">
            <ColumnHeaderFilter
              column={column}
              options={[ALL_FILTER_OPTION, ...filterOptions.tipos]}
              label="tipo"
            />
          </FilterHeader>
        ),
        filterFn: exactFilter((row) => row.producto_info.tipo),
        meta: { label: "Tipo" } as const,
        cell: (info) => {
          const tipo = info.getValue();
          if (!tipo) return <span className="text-xs text-slate-400">—</span>;
          const colors: Record<string, string> = {
            MP: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
            PT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
            PP: "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
          };
          return (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full leading-none ${colors[tipo] ?? "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"}`}>
              {tipo}
            </span>
          );
        },
      }
    ),
    columnHelper.accessor(
      (row) => row.producto_info.color,
      {
        id: "color",
        header: ({ column }) => (
          <FilterHeader title="Color">
            <ColumnHeaderFilter
              column={column}
              options={[ALL_FILTER_OPTION, ...filterOptions.colores]}
              label="color"
              searchable={{ placeholder: "Buscar color…" }}
            />
          </FilterHeader>
        ),
        filterFn: exactFilter((row) => row.producto_info.color),
        meta: { label: "Color" } as const,
        cell: (info) => {
          const color = info.getValue();
          if (!color) {
            return <span className="text-xs text-slate-400 dark:text-slate-500">—</span>;
          }
          return (
            <div className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full border border-slate-200 dark:border-white/20 shrink-0"
                style={{ backgroundColor: colorToHex(color) }}
                title={color}
              />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200 capitalize">
                {color.toLowerCase()}
              </span>
            </div>
          );
        },
      }
    ),
    columnHelper.accessor(
      (row) => row.stock,
      {
        id: "disponible",
        header: ({ column }) => (
          <FilterHeader title="Existencias">
            <ColumnHeaderFilter
              column={column}
              options={EXISTENCIAS_FILTER_OPTIONS}
              label="rango de existencias"
              menuAlign="end"
            />
          </FilterHeader>
        ),
        filterFn: (row, _columnId, filterValue) =>
          matchesRangeFilter(EXISTENCIAS_RANGES, row.original.stock, filterValue),
        meta: { label: "Existencias", align: "right" } as const,
        sortingFn: "basic",
        cell: (info) => {
          const stock = info.getValue();
          const cantidad = info.row.original.cantidad;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0 bg-sky-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {stock.toLocaleString("es-MX")}
              </span>
              {cantidad && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  ({Number(cantidad).toFixed(2)})
                </span>
              )}
            </div>
          );
        },
      }
    ),
    columnHelper.accessor(
      (row) => row.fecha_actualizacion,
      {
        id: "actualizacion",
        header: ({ column }) => (
          <FilterHeader title="Última actualización">
            <ColumnHeaderFilter
              column={column}
              options={[ALL_FILTER_OPTION, ...filterOptions.meses]}
              label="mes de actualización"
            />
          </FilterHeader>
        ),
        filterFn: (row, _columnId, filterValue) =>
          matchesMonthFilter(row.original.fecha_actualizacion, filterValue),
        meta: { label: "Última actualización" } as const,
        cell: (info) => {
          const raw = info.getValue();
          if (!raw) return <span className="text-xs text-slate-400">—</span>;
          try {
            const date = new Date(raw);
            const formatted = date.toLocaleDateString("es-MX", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {formatted}
              </span>
            );
          } catch {
            return <span className="text-xs text-slate-400">{raw}</span>;
          }
        },
      }
    ),
    columnHelper.accessor(
      (row) => row.ubicacion_info?.nombre_completo,
      {
        id: "ubicacion",
        header: ({ column }) => (
          <FilterHeader title="Ubicación">
            <ColumnHeaderFilter
              column={column}
              options={[ALL_FILTER_OPTION, ...filterOptions.ubicaciones]}
              label="ubicación"
              searchable={{ placeholder: "Buscar ubicación…" }}
            />
          </FilterHeader>
        ),
        filterFn: exactFilter((row) => row.ubicacion_info?.nombre_completo),
        size: 300,
        meta: { label: "Ubicación" } as const,
        cell: (info) => {
          const ubicacion = info.getValue();
          if (!ubicacion) {
            return <span className="text-xs text-slate-400 dark:text-slate-500">—</span>;
          }
          return (
            <div className="flex items-start gap-1 text-[11px] text-slate-400 dark:text-slate-500">
              <MapPinIcon className="w-3 h-3 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{ubicacion}</span>
            </div>
          );
        },
      }
    ),
    // Accessor (y no `display`) para que TanStack permita filtrarla; el valor
    // es el mismo estado calculado contra el máximo del almacén que pinta la celda.
    columnHelper.accessor((row) => getStockStatus(row.stock, effectiveMax), {
      id: "estado",
      enableSorting: false,
      header: ({ column }) => (
        <FilterHeader title="Estado">
          <ColumnHeaderFilter column={column} options={ESTADO_FILTER_OPTIONS} label="estado" />
        </FilterHeader>
      ),
      filterFn: (row, _columnId, filterValue) =>
        !filterValue || getStockStatus(row.original.stock, effectiveMax) === filterValue,
      meta: { label: "Estado" } as const,
      cell: (info) => {
        const stock = info.row.original.stock;
        const status = getStockStatus(stock, effectiveMax);
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
    // columnHelper.display({
    //   id: "actions",
    //   header: "Acciones",
    //   size: 90,
    //   cell: ({ row }) => <ActionsCell stock={row.original} />,
    // }),
  ] as ColumnDef<StockItem>[];
}

/** @deprecated Usa `getStockColumns(maxStock)` en lugar de esta constante. */
export const stockColumns: ColumnDef<StockItem>[] = getStockColumns();
