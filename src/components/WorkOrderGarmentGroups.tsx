"use client";

import type { ReactNode } from "react";
import { EmptyLines } from "@/src/components/DetailDialogPrimitives";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { pluralForQuantity } from "@/src/utils/plural";
import {
  groupWorkOrderGarments,
  workOrderGarmentOptionalColumns,
  workOrderQuantityOrDash,
  type WorkOrderGarmentLine,
} from "@/src/utils/workOrderGarments";

export type { WorkOrderGarmentLine } from "@/src/utils/workOrderGarments";

/** Columna extra propia de cada módulo (bordado, tipo de reflejante, metros…). */
export interface WorkOrderGarmentColumn<T> {
  key: string;
  label: string;
  align?: "left" | "right";
  render: (item: T) => ReactNode;
}

interface WorkOrderGarmentGroupsProps<T> {
  items: T[];
  toLine: (item: T) => WorkOrderGarmentLine;
  /** Se pintan después de SKU y antes de las cantidades. */
  columns?: WorkOrderGarmentColumn<T>[];
}

/**
 * Prendas de una orden de trabajo: una tarjeta desplegable por prenda + color.
 * En el encabezado se leen las tallas con sus piezas y el total; al abrirla,
 * el desglose por talla con SKU, las columnas propias del módulo y las
 * cantidades del pedido. No se oculta ningún dato: solo deja de repetirse el
 * nombre de la prenda en cada talla.
 *
 * Las columnas "Programado", "Pedido", "Pendiente" y "SKU" solo aparecen si
 * algún renglón trae el dato (corte de manga aún no las manda).
 */
export function WorkOrderGarmentGroups<T>({
  items,
  toLine,
  columns = [],
}: WorkOrderGarmentGroupsProps<T>) {
  if (items.length === 0) {
    return <EmptyLines>Esta orden no tiene artículos registrados.</EmptyLines>;
  }

  const list = groupWorkOrderGarments(items, toLine);
  const {
    sku: showSku,
    programado: showProgramado,
    pedido: showPedido,
    pendiente: showPendiente,
  } = workOrderGarmentOptionalColumns(list.flatMap((g) => g.rows.map((r) => r.line)));

  const th = "py-2 pr-3 font-medium";
  const num = "py-2 pr-3 text-right tabular-nums text-slate-500 dark:text-slate-400";

  return (
    <div className="space-y-2">
      {list.map((group) => (
        <details
          key={group.key}
          open={list.length === 1}
          className="group rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] open:bg-white dark:open:bg-white/[0.04]"
        >
          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90"
              fill="currentColor"
            >
              <path d="M7.2 4.7a.75.75 0 0 1 1.06 0l4.77 4.77a.75.75 0 0 1 0 1.06l-4.77 4.77a.75.75 0 1 1-1.06-1.06L11.44 10 7.2 5.76a.75.75 0 0 1 0-1.06Z" />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-white">
                {group.producto}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {group.color ?? "Sin color"} · {group.rows.length}{" "}
                {pluralForQuantity(group.rows.length, "talla", "tallas")}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {group.rows.map(({ line }) => (
                <span
                  key={line.id}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-white/10 px-2.5 py-0.5 text-xs text-slate-600 dark:text-slate-300"
                >
                  <span className="font-medium">{line.talla ?? "—"}</span>
                  <span className="tabular-nums font-semibold text-slate-900 dark:text-white">
                    {formatQuantityValue(line.cantidad)}
                  </span>
                </span>
              ))}
            </div>
            <span className="ml-auto shrink-0 text-right tabular-nums">
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {formatQuantityValue(group.total)}
              </span>{" "}
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {pluralForQuantity(group.total, "pieza", "piezas")}
              </span>
            </span>
          </summary>

          <div className="overflow-x-auto border-t border-slate-200 dark:border-white/10 px-4 pb-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className={th}>Talla</th>
                  {showSku && <th className={th}>SKU</th>}
                  {columns.map((col) => (
                    <th key={col.key} className={`${th} ${col.align === "right" ? "text-right" : ""}`}>
                      {col.label}
                    </th>
                  ))}
                  <th className={`${th} text-right`}>En esta orden</th>
                  {showProgramado && <th className={`${th} text-right`}>Programado</th>}
                  {showPedido && <th className={`${th} text-right`}>Pedido</th>}
                  {showPendiente && <th className={`${th} text-right`}>Pendiente</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {group.rows.map(({ item, line }) => (
                  <tr key={line.id} className="align-top">
                    <td className="py-2 pr-3 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {line.talla ?? "—"}
                    </td>
                    {showSku && (
                      <td className="py-2 pr-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {line.sku?.trim() || "—"}
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`py-2 pr-3 text-slate-600 dark:text-slate-300 ${col.align === "right" ? "text-right tabular-nums" : ""}`}
                      >
                        {col.render(item)}
                      </td>
                    ))}
                    <td className="py-2 pr-3 text-right tabular-nums font-semibold text-slate-900 dark:text-white">
                      {formatQuantityValue(line.cantidad)}
                    </td>
                    {showProgramado && <td className={num}>{workOrderQuantityOrDash(line.programado)}</td>}
                    {showPedido && <td className={num}>{workOrderQuantityOrDash(line.pedido)}</td>}
                    {showPendiente && <td className={num}>{workOrderQuantityOrDash(line.pendiente)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </div>
  );
}
