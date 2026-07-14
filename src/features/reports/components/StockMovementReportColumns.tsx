"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { StockMovementReportRow } from "@/src/features/stock/interfaces/stock-movement-report.interface";
// Se reutiliza el MISMO mapa de estilos por tipo de movimiento del módulo de
// movimientos (badge con punto de color), en vez de re-declararlo.
import { MOVEMENT_TYPE_CONFIG } from "@/src/features/stock-movements/components/StockMovementsColumns";
import { formatMoneyValue, formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";

// Formato de hora, espejo de la tabla de movimientos (no existe un util
// compartido de fecha+hora en el proyecto).
function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Marcador para valores de texto vacíos, con el mismo estilo que el resto de
// tablas del proyecto (StockColumns / StockReportColumns).
const Dash = () => (
  <span className="text-xs text-slate-400 dark:text-slate-600">—</span>
);

// ── Columnas de la tabla del reporte de movimientos ──────────────────────────

export const stockMovementReportColumns: ColumnDef<StockMovementReportRow>[] = [
  {
    accessorKey: "fecha_movimiento",
    header: "Fecha",
    meta: { label: "Fecha" },
    cell: ({ row }) => {
      const raw = row.original.fecha_movimiento;
      if (!raw) return <Dash />;
      return (
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {formatShortDate(raw)}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            {formatTime(raw)}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "tipo_movimiento",
    header: "Tipo",
    meta: { label: "Tipo Movimiento" },
    cell: ({ row }) => {
      const tipo = row.original.tipo_movimiento;
      const cfg = MOVEMENT_TYPE_CONFIG[tipo] ?? {
        label: tipo,
        dot: "bg-slate-400",
        badgeClass:
          "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-300 dark:border-slate-800/50",
        textClass: "text-slate-600 dark:text-slate-400",
      };
      return (
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border leading-none ${cfg.badgeClass}`}
          >
            {cfg.label}
          </span>
        </div>
      );
    },
  },
  {
    // `producto_nombre` cae al nombre base cuando el renglón no trae variante.
    // `accessorFn` (no solo `id`) es necesario para que el filtro global de
    id: "producto_nombre",
    accessorFn: (row) => row.producto_nombre || row.producto_base_nombre || "",
    header: "Producto",
    meta: { label: "Producto" },
    cell: ({ row }) => {
      const nombre = row.original.producto_nombre || row.original.producto_base_nombre;
      return nombre ? (
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">
          {nombre}
        </span>
      ) : (
        <Dash />
      );
    },
  },
  {
    accessorKey: "almacen_nombre",
    header: "Almacén",
    meta: { label: "Almacén" },
    cell: ({ row }) =>
      row.original.almacen_nombre ? (
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {row.original.almacen_nombre}
        </span>
      ) : (
        <Dash />
      ),
  },
  {
    accessorKey: "ubicacion_nombre",
    header: "Ubicación",
    meta: { label: "Ubicación" },
    cell: ({ row }) =>
      row.original.ubicacion_nombre ? (
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {row.original.ubicacion_nombre}
        </span>
      ) : (
        <Dash />
      ),
  },
  {
    accessorKey: "cantidad",
    header: "Cantidad",
    meta: { label: "Cantidad" },
    cell: ({ row }) => (
      <div className="text-right tabular-nums text-slate-700 dark:text-slate-200">
        {formatQuantityValue(row.original.cantidad)}
      </div>
    ),
  },
  {
    accessorKey: "costo_total",
    header: "Costo Total",
    meta: { label: "Costo Total" },
    cell: ({ row }) => (
      <div className="text-right font-semibold tabular-nums text-slate-700 dark:text-slate-200">
        {formatMoneyValue(row.original.costo_total)}
      </div>
    ),
  },
  {
    accessorKey: "usuario_nombre",
    header: "Usuario",
    meta: { label: "Usuario" },
    cell: ({ row }) =>
      row.original.usuario_nombre ? (
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {row.original.usuario_nombre}
        </span>
      ) : (
        <Dash />
      ),
  },
];
