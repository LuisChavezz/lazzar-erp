"use client";

import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { InfoIcon, MapPinIcon } from "@/src/components/Icons";
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
export function getStockColumns(maxStock?: number, onSkuInfoClick?: () => void) {
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
        header: "Producto",
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
        header: "Tipo",
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
        header: "Color",
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
      (row) => row.almacen_info?.nombre ?? "",
      {
        id: "almacen",
        header: "Almacén",
        meta: { label: "Almacén" } as const,
        cell: (info) => (
          <span className="text-xs text-slate-600 dark:text-slate-300">
            {info.getValue()}
          </span>
        ),
      }
    ),
    columnHelper.accessor(
      (row) => row.stock,
      {
        id: "disponible",
        header: "Existencias",
        meta: { label: "Existencias" } as const,
        sortingFn: "basic",
        cell: (info) => {
          const stock = info.getValue();
          const cantidad = info.row.original.cantidad;
          return (
            <div className="flex items-center gap-1.5">
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
        header: "Última actualización",
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
        header: "Ubicación",
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
    columnHelper.display({
      id: "estado",
      header: "Estado",
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
    //   header: () => <div className="text-center">Acciones</div>,
    //   size: 90,
    //   cell: ({ row }) => <ActionsCell stock={row.original} />,
    // }),
  ] as ColumnDef<StockItem>[];
}

/** @deprecated Usa `getStockColumns(maxStock)` en lugar de esta constante. */
export const stockColumns: ColumnDef<StockItem>[] = getStockColumns();
