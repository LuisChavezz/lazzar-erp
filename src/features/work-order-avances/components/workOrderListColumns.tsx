"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import {
  CantidadCell,
  FechaCell,
  VenceCell,
} from "@/src/features/production-orders/components/ProductionOrderListCells";
import type { WorkOrderResumenAvance } from "../interfaces/work-order-avance.interface";

/** Lo que cada listado sabe leer de su fila. */
export interface WorkOrderListFields<T> {
  fechaPedido: (row: T) => string | null | undefined;
  fechaVence: (row: T) => string | null | undefined;
  /** Piezas de la orden si el backend no manda `resumen_avance` (suma de `detalles`). */
  piezas: (row: T) => number | undefined;
  resumen: (row: T) => WorkOrderResumenAvance | undefined;
  /** "bordadas", "reflejadas", "cortadas". */
  verbo: string;
}

/**
 * Avance de la orden: barra + "x de y" + %. Verde al completar, azul en
 * proceso, gris sin empezar. Solo informativo.
 */
function AvanceCell({ resumen, verbo }: { resumen: WorkOrderResumenAvance | undefined; verbo: string }) {
  if (!resumen) return <span className="text-xs text-slate-400 dark:text-slate-600">—</span>;
  const programado = resumen.cantidad_programada;
  const realizado = resumen.cantidad_realizada_total;
  const pct = Math.min(
    100,
    Math.max(0, Math.round(resumen.porcentaje_avance ?? (programado > 0 ? (realizado / programado) * 100 : 0))),
  );
  const done = programado > 0 && realizado >= programado;
  const tone = done
    ? { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" }
    : realizado > 0
      ? { bar: "bg-sky-500", text: "text-sky-600 dark:text-sky-400" }
      : { bar: "bg-slate-400", text: "text-slate-500 dark:text-slate-400" };

  return (
    <div className="flex flex-col gap-1 min-w-28" title={`${realizado} de ${programado} piezas ${verbo}`}>
      <span className="flex items-baseline justify-between gap-2 text-[11px] whitespace-nowrap">
        <span className="tabular-nums text-slate-600 dark:text-slate-300">
          {formatQuantityValue(realizado)}/{formatQuantityValue(programado)} {verbo}
        </span>
        <span className={`font-semibold tabular-nums ${tone.text}`}>{pct}%</span>
      </span>
      <span
        className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Avance: ${pct}%`}
      >
        <span className={`block h-full rounded-full ${tone.bar}`} style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}

/**
 * Columnas comunes de las órdenes de bordado, reflejante y corte de manga:
 * Fecha pedido, Vence, Cantidad y Avance (el equivalente a la ruta crítica de
 * una OP). Van justo después de Folio y Pedido.
 */
export function getWorkOrderProgressColumns<T>(fields: WorkOrderListFields<T>): ColumnDef<T, unknown>[] {
  const piezas = (row: T) => fields.resumen(row)?.cantidad_programada ?? fields.piezas(row);
  return [
    {
      id: "fecha_pedido",
      accessorFn: (row) => fields.fechaPedido(row) ?? undefined,
      header: "Fecha pedido",
      size: 115,
      sortUndefined: "last",
      enableGlobalFilter: false,
      cell: ({ row }) => <FechaCell value={fields.fechaPedido(row.original)} />,
    },
    {
      id: "fecha_vence",
      accessorFn: (row) => fields.fechaVence(row) ?? undefined,
      header: "Vence",
      size: 110,
      sortUndefined: "last",
      enableGlobalFilter: false,
      cell: ({ row }) => <VenceCell value={fields.fechaVence(row.original)} />,
    },
    {
      id: "cantidad_total",
      accessorFn: (row) => piezas(row),
      header: "Cantidad",
      size: 100,
      sortUndefined: "last",
      enableGlobalFilter: false,
      meta: { align: "right" },
      cell: ({ row }) => <CantidadCell value={piezas(row.original)} />,
    },
    {
      id: "avance",
      accessorFn: (row) => fields.resumen(row)?.porcentaje_avance,
      header: "Avance",
      size: 160,
      sortUndefined: "last",
      enableGlobalFilter: false,
      cell: ({ row }) => <AvanceCell resumen={fields.resumen(row.original)} verbo={fields.verbo} />,
    },
  ];
}

/** Suma `cantidad` de los renglones, descartando valores no finitos. */
export const sumDetalles = (detalles: { cantidad: number }[] | undefined) =>
  detalles?.reduce((acc, d) => acc + (Number.isFinite(d.cantidad) ? d.cantidad : 0), 0);
