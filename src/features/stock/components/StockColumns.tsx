"use client";

import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { InfoIcon, MapPinIcon } from "@/src/components/Icons";
import { FilterHeader, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { ALL_FILTER_OPTION } from "@/src/utils/columnFilterOptions";
import { MEXICO_TIME_ZONE } from "@/src/utils/mexicoTime";
import type {
  StockEstado,
  StockExistenciasRango,
  StockPorAlmacenItem,
} from "../interfaces/stock-por-almacen.interface";
import { STOCK_ESTADOS, STOCK_EXISTENCIAS_RANGOS } from "../constants/stockPorAlmacen";
import { StockResumenHeaderFilter } from "./StockResumenHeaderFilter";
import { colorToHex } from "./stock-colors";

// ─── Mapas de estilos ────────────────────────────────────────────────────────

/**
 * Presentación del estado de stock que calcula el backend (`row.estado`,
 * contra el stock máximo del almacén completo): > 80 % Óptimo, > 40 % Normal,
 * > 15 % Bajo, el resto Crítico.
 */
export const STATUS_CONFIG: Record<
  StockEstado,
  { label: string; dot: string; textClass: string }
> = {
  full:     { label: "Óptimo",  dot: "bg-emerald-500",              textClass: "text-emerald-600 dark:text-emerald-400" },
  ok:       { label: "Normal",  dot: "bg-sky-500",                  textClass: "text-sky-600 dark:text-sky-400" },
  low:      { label: "Bajo",    dot: "bg-amber-500",                textClass: "text-amber-600 dark:text-amber-400" },
  critical: { label: "Crítico", dot: "bg-red-500 animate-pulse",   textClass: "text-red-600 dark:text-red-400" },
};

// ─── Filtros de encabezado con opciones fijas ────────────────────────────────

/** Etiquetas de los rangos de `?existencias=` (piezas disponibles). */
const EXISTENCIAS_LABELS: Record<StockExistenciasRango, string> = {
  cero: "Sin existencias",
  "1-10": "1 a 10",
  "11-100": "11 a 100",
  "mas-100": "Más de 100",
};

const EXISTENCIAS_FILTER_OPTIONS: ColumnFilterOption[] = [
  ALL_FILTER_OPTION,
  ...STOCK_EXISTENCIAS_RANGOS.map((value) => ({ value, label: EXISTENCIAS_LABELS[value] })),
];

const ESTADO_FILTER_OPTIONS: ColumnFilterOption[] = [
  ALL_FILTER_OPTION,
  ...STOCK_ESTADOS.map((status) => ({
    value: status,
    label: STATUS_CONFIG[status].label,
    dotClassName: STATUS_CONFIG[status].dot,
  })),
];

// ─── Encabezado de columna SKU ───────────────────────────────────────────────

/**
 * Encabezado de la columna "SKU" con un ícono de información. El diálogo
 * explicativo vive en `StockView` (las celdas y encabezados se remontan al
 * ordenar o paginar).
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

/**
 * "Última actualización" en hora de México, la misma zona en la que el
 * backend arma el filtro `mes` y sus opciones: así una fila del 1.º de
 * noviembre a las 00:30 se ve en noviembre aunque el navegador esté en otra
 * zona. Un solo formateador para todas las celdas (crearlo es caro).
 */
const FECHA_ACTUALIZACION_FORMAT = new Intl.DateTimeFormat("es-MX", {
  timeZone: MEXICO_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const EmptyDash = () => <span className="text-xs text-slate-400 dark:text-slate-500">—</span>;

// ─── Columnas de la tabla ────────────────────────────────────────────────────

const columnHelper = createColumnHelper<StockPorAlmacenItem>();

/**
 * Columnas de la tabla de existencias en MODO SERVIDOR
 * (`useStockPorAlmacenTable`): el backend filtra, busca, ordena y pagina.
 *
 * - `meta.serverSort` = campo de `ordering` del backend; `meta.serverFilter` =
 *   clave del filtro que controla el encabezado. Estado no ordena.
 * - Las opciones de los filtros son fijas (Existencias, Estado) o salen de
 *   `resumen.opciones` del almacén completo (`StockResumenHeaderFilter`),
 *   nunca de las filas cargadas.
 * - `producto_info` y `fecha_actualizacion` pueden venir `null`: cada celda
 *   pinta "—" en ese caso.
 */
export function getStockColumns(onSkuInfoClick?: () => void) {
  return [
    columnHelper.accessor((row) => row.producto_info?.sku ?? "", {
      id: "sku",
      header: () => <SkuColumnHeader onInfoClick={onSkuInfoClick} />,
      meta: { label: "SKU", serverSort: "sku" } as const,
      cell: (info) => {
        const sku = info.getValue();
        return sku ? (
          <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
            {sku}
          </span>
        ) : (
          <EmptyDash />
        );
      },
    }),
    columnHelper.accessor((row) => row.producto_info?.nombre ?? "", {
      id: "producto",
      header: ({ column }) => (
        <StockResumenHeaderFilter
          column={column}
          title="Producto"
          optionKey="nombre"
          label="producto"
          searchPlaceholder="Buscar producto…"
        />
      ),
      meta: { label: "Producto", serverSort: "nombre", serverFilter: "nombre" } as const,
      cell: (info) => {
        const nombre = info.getValue();
        return nombre ? (
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">
            {nombre}
          </span>
        ) : (
          <EmptyDash />
        );
      },
    }),
    columnHelper.accessor((row) => row.producto_info?.tipo ?? "", {
      id: "tipo",
      header: ({ column }) => (
        <StockResumenHeaderFilter column={column} title="Tipo" optionKey="tipo" label="tipo" />
      ),
      meta: { label: "Tipo", serverSort: "tipo", serverFilter: "tipo" } as const,
      cell: (info) => {
        const tipo = info.getValue();
        if (!tipo) return <EmptyDash />;
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
    }),
    columnHelper.accessor((row) => row.producto_info?.color ?? "", {
      id: "color",
      header: ({ column }) => (
        <StockResumenHeaderFilter
          column={column}
          title="Color"
          optionKey="color"
          label="color"
          searchPlaceholder="Buscar color…"
        />
      ),
      meta: { label: "Color", serverSort: "color", serverFilter: "color" } as const,
      cell: (info) => {
        const color = info.getValue();
        if (!color) return <EmptyDash />;
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
    }),
    columnHelper.accessor((row) => row.stock, {
      id: "disponible",
      header: ({ column }) => (
        <FilterHeader
          title="Existencias"
          column={column}
          options={EXISTENCIAS_FILTER_OPTIONS}
          label="rango de existencias"
          menuAlign="end"
        />
      ),
      meta: {
        label: "Existencias",
        align: "right",
        serverSort: "stock",
        serverFilter: "existencias",
      } as const,
      cell: (info) => {
        const stock = info.getValue();
        const cantidad = info.row.original.cantidad;
        return (
          <div className="flex items-center justify-end gap-1.5 tabular-nums">
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
    }),
    columnHelper.accessor((row) => row.fecha_actualizacion ?? "", {
      id: "actualizacion",
      header: ({ column }) => (
        <StockResumenHeaderFilter
          column={column}
          title="Última actualización"
          optionKey="mes"
          label="mes de actualización"
        />
      ),
      meta: {
        label: "Última actualización",
        serverSort: "fecha_actualizacion",
        serverFilter: "mes",
      } as const,
      cell: (info) => {
        const raw = info.getValue();
        if (!raw) return <EmptyDash />;
        const date = new Date(raw);
        if (Number.isNaN(date.getTime())) {
          return <span className="text-xs text-slate-400">{raw}</span>;
        }
        return (
          <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {FECHA_ACTUALIZACION_FORMAT.format(date)}
          </span>
        );
      },
    }),
    columnHelper.accessor((row) => row.ubicacion_info?.nombre_completo ?? "", {
      id: "ubicacion",
      header: ({ column }) => (
        <StockResumenHeaderFilter
          column={column}
          title="Ubicación"
          optionKey="ubicacion"
          label="ubicación"
          searchPlaceholder="Buscar ubicación…"
        />
      ),
      size: 300,
      meta: { label: "Ubicación", serverSort: "ubicacion_nombre", serverFilter: "ubicacion" } as const,
      cell: (info) => {
        const ubicacion = info.getValue();
        if (!ubicacion) return <EmptyDash />;
        return (
          <div className="flex items-start gap-1 text-[11px] text-slate-400 dark:text-slate-500">
            <MapPinIcon className="w-3 h-3 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{ubicacion}</span>
          </div>
        );
      },
    }),
    columnHelper.accessor((row) => row.estado, {
      id: "estado",
      enableSorting: false,
      header: ({ column }) => (
        <FilterHeader title="Estado" column={column} options={ESTADO_FILTER_OPTIONS} label="estado" />
      ),
      meta: { label: "Estado", serverFilter: "estado" } as const,
      cell: (info) => {
        const cfg = STATUS_CONFIG[info.getValue()] ?? STATUS_CONFIG.critical;
        return (
          <div className="flex items-center gap-1 shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            <span className={`text-[10px] font-semibold ${cfg.textClass}`}>{cfg.label}</span>
          </div>
        );
      },
    }),
  ] as ColumnDef<StockPorAlmacenItem>[];
}
