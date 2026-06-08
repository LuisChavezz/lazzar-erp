"use client";

import { useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { MapPinIcon, HistoryIcon } from "@/src/components/Icons";
import { StockItem } from "../interfaces/stock.interface";
import { WmsStockHistoryDialog } from "../../wms/components/WmsStockHistoryDialog";
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

// ─── Componente: Anillo de stock (SVG donut) ──────────────────────────────────
// Mantenido para cuando se reactive la columna "Stock" (actualmente comentada).

// interface StockRingProps {
//   stock: number;
//   maxStock: number;
//   status: StockStatus;
// }

/** Anillo donut SVG que muestra el nivel de stock respecto al máximo del conjunto. */
// function StockRing({ stock, maxStock, status }: StockRingProps) {
//   const SIZE = 78;
//   const R    = 29;
//   const SW   = 7;
//   const C    = 2 * Math.PI * R;
//   const CX   = SIZE / 2;
//   const CY   = SIZE / 2;

//   const pctStock = maxStock > 0 ? Math.min(stock / maxStock, 1) : 0;
//   const stockLen = C * pctStock;
//   const percentage = Math.round(pctStock * 100);

//   const centerFillClass: Record<StockStatus, string> = {
//     full:     "fill-emerald-500",
//     ok:       "fill-sky-500",
//     low:      "fill-amber-500",
//     critical: "fill-red-500",
//   };

//   return (
//     <div className="flex flex-col items-center gap-1">
//       <svg
//         width={SIZE}
//         height={SIZE}
//         viewBox={`0 0 ${SIZE} ${SIZE}`}
//         aria-hidden="true"
//         role="img"
//       >
//         {/* Pista de fondo */}
//         <circle
//           cx={CX}
//           cy={CY}
//           r={R}
//           fill="none"
//           strokeWidth={SW}
//           className="stroke-slate-100 dark:stroke-white/10"
//         />

//         {/* Arco: nivel de stock */}
//         {pctStock > 0.005 && (
//           <circle
//             cx={CX}
//             cy={CY}
//             r={R}
//             fill="none"
//             strokeWidth={SW}
//             stroke="#0ea5e9"
//             strokeDasharray={`${stockLen} ${C}`}
//             strokeLinecap="butt"
//             style={{
//               transform: "rotate(-90deg)",
//               transformOrigin: `${CX}px ${CY}px`,
//             }}
//           />
//         )}

//         {/* Porcentaje central */}
//         <text
//           x={CX}
//           y={CY + 1}
//           textAnchor="middle"
//           dominantBaseline="middle"
//           fontSize={12}
//           fontWeight={700}
//           className={centerFillClass[status]}
//         >
//           {percentage}%
//         </text>
//       </svg>
//     </div>
//   );
// }

// ─── Componente: celda de acciones ────────────────────────────────────────────

function ActionsCell({ stock }: { stock: StockItem }) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const actionItems: ActionMenuItem[] = [
    {
      label: "Ver historial",
      icon: HistoryIcon,
      // onSelect: () => setIsHistoryOpen(true),
    },
  ];

  return (
    <div className="flex items-center justify-center">
      <ActionMenu items={actionItems} ariaLabel="Acciones de existencias" />
      <WmsStockHistoryDialog
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        stockItem={stock}
      />
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
 * Recibe el valor máximo de stock del conjunto de datos para escalar los anillos.
 */
export function getStockColumns(maxStock?: number) {
  const effectiveMax = maxStock ?? DEFAULT_MAX_STOCK;

  return [
    columnHelper.accessor(
      (row) => row.producto_info.sku ?? "",
      {
        id: "sku",
        header: "SKU",
        meta: { label: "SKU" } as const,
        cell: (info) => (
          <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
            {info.getValue()}
          </span>
        ),
      }
    ),
    columnHelper.accessor(
      (row) => row.producto_info.nombre ?? "",
      {
        id: "descripcion",
        header: "Descripción",
        meta: { label: "Descripción" } as const,
        cell: (info) => (
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">
            {info.getValue()}
          </span>
        ),
      }
    ),
    columnHelper.accessor(
      (row) => row.producto_info.categoria_producto,
      {
        id: "categoria",
        header: "Categoría",
        meta: { label: "Categoría" } as const,
        cell: (info) => {
          const catId = info.getValue();
          return (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full leading-none bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">
              {catId != null ? `Cat. ${catId}` : "—"}
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
    // columnHelper.accessor(
    //   (row) => row.almacen_info,
    //   {
    //     id: "almacen",
    //     header: "Almacén",
    //     meta: { label: "Almacén" } as const,
    //     cell: (info) => {
    //       const wh = info.getValue();
    //       return (
    //         <div className="min-w-0">
    //           <span className="text-[10px] font-medium px-2 py-0.5 rounded-full leading-none bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-800/50">
    //             {wh.codigo ?? "—"}
    //           </span>
    //           <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
    //             <BuildingIcon className="w-3 h-3 shrink-0 text-slate-400" />
    //             <span className="truncate">{wh.nombre ?? "—"}</span>
    //           </p>
    //         </div>
    //       );
    //     },
    //   }
    // ),
    // columnHelper.accessor(
      //   (row) => row.stock,
      //   {
        //     id: "stock",
        //     header: "Stock",
        //     meta: { label: "Stock" } as const,
        //     enableSorting: true,
        //     sortingFn: "basic",
        //     cell: (info) => {
          //       const stock = info.getValue();
          //       const item = info.row.original;
          //       const status = getStockStatus(stock, effectiveMax);
          //       return (
            //         <StockRing stock={stock} maxStock={effectiveMax} status={status} />
            //       );
            //     },
            //   }
            // ),
    columnHelper.accessor(
      (row) => row.stock,
      {
        id: "disponible",
        header: "Existencias",
        meta: { label: "Existencias" } as const,
        sortingFn: "basic",
        cell: (info) => {
          const stock = info.getValue();
          const unidad = info.row.original.producto_info.unidad_medida?.toString() ?? "uds";
          return (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0 bg-sky-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {stock.toLocaleString("es-MX")}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">{unidad}</span>
            </div>
          );
        },
      }
    ),
    columnHelper.accessor(
      (row) => row.ubicacion_info.nombre_completo ?? "",
      {
        id: "ubicacion",
        header: "Ubicación",
        meta: { label: "Ubicación" } as const,
        cell: (info) => (
          <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
            <MapPinIcon className="w-3 h-3 shrink-0" />
            <span className="truncate">{info.getValue()}</span>
          </div>
        ),
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
    columnHelper.display({
      id: "actions",
      header: () => <div className="text-center">Acciones</div>,
      size: 90,
      cell: ({ row }) => <ActionsCell stock={row.original} />,
    }),
  ] as ColumnDef<StockItem>[];
}

/** @deprecated Usa `getStockColumns(maxStock)` en lugar de esta constante. */
export const stockColumns: ColumnDef<StockItem>[] = getStockColumns();
