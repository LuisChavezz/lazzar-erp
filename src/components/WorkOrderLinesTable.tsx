"use client";

import type { ReactNode } from "react";
import { DecimalQuantityInput } from "@/src/components/DecimalQuantityInput";
import { LayersIcon } from "@/src/components/Icons";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { workOrderProductLabel } from "@/src/utils/workOrderProductLabel";
import {
  workOrderLineDescripcion,
  workOrderLineSampleSku,
  type WorkOrderLineRow,
} from "@/src/utils/workOrderLineQuantities";

/** Lo que pinta cada fila, además de lo que usan las reglas de captura. */
export interface WorkOrderLinesTableRow extends WorkOrderLineRow {
  color_nombre: string | null;
  cantidad_pedido: number;
  cantidad_asignada: number;
}

interface WorkOrderLinesTableProps<Row extends WorkOrderLinesTableRow> {
  /** Encabezado de la tarjeta: "Prendas a reflejar", "Prendas a cortar". */
  title: string;
  /** Verbo del `aria-label` de la cantidad: "Piezas a {verbo} de …". */
  quantityVerb: string;
  /** Prefijo del `id` de cada casilla, único por módulo. */
  inputIdPrefix: string;
  rows: Row[];
  /** Techo por línea (`min(pendiente, disponible)`), por id. */
  ceilings: Map<number, number>;
  checkedIds: Set<number>;
  /** Cantidad capturada por id. Una línea desmarcada NO tiene entrada. */
  quantities: Map<number, string>;
  availableRowsCount: number;
  selectedCount: number;
  onToggleLine: (pedidoDetalleTallaId: number) => void;
  onToggleAll: (checked: boolean) => void;
  onQuantityChange: (pedidoDetalleTallaId: number, value: string) => void;
  /**
   * Segunda fila opcional, FUERA del `<label>` de la casilla (un botón dentro
   * de la etiqueta reenviaría su clic a la casilla). `null` no pinta nada. OR
   * la usa para el popover de `reflejante_config`.
   */
  renderRowFooter?: (row: Row) => ReactNode;
}

/**
 * Tabla de prendas del pedido elegido en el Paso 2 de las altas de OR y OCM:
 * una casilla POR LÍNEA más la cantidad de piezas que entran en esta orden.
 * Extraída de `ReflectiveOrderLinesTable` (EC-967) con el mismo marcado.
 *
 * La casilla por línea con "Marcar/Quitar todas" y el renglón agotado
 * deshabilitado son de `ShippingLinesTable`; el input con techo por línea es el
 * `DecimalQuantityInput` de picking/packing, con `decimalPlaces={0}` porque el
 * backend rechaza fraccionarios con un 400.
 *
 * Las líneas sin techo (ya cubiertas por otras órdenes, o sin saldo de lo
 * programado) se muestran deshabilitadas y etiquetadas «Ya programada», no
 * ocultas: forman parte del pedido.
 */
export function WorkOrderLinesTable<Row extends WorkOrderLinesTableRow>({
  title,
  quantityVerb,
  inputIdPrefix,
  rows,
  ceilings,
  checkedIds,
  quantities,
  availableRowsCount,
  selectedCount,
  onToggleLine,
  onToggleAll,
  onQuantityChange,
  renderRowFooter,
}: WorkOrderLinesTableProps<Row>) {
  const allAvailableChecked =
    availableRowsCount > 0 && selectedCount === availableRowsCount;

  return (
    <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
        <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm shrink-0">
          <LayersIcon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{title}</h3>
          <p className="text-[11px] text-slate-500">
            {selectedCount === 0
              ? "Ninguna prenda marcada"
              : `${selectedCount} de ${availableRowsCount} prenda${
                  availableRowsCount === 1 ? "" : "s"
                } disponible${availableRowsCount === 1 ? "" : "s"} marcada${
                  selectedCount === 1 ? "" : "s"
                }`}
          </p>
        </div>
        {availableRowsCount > 0 && (
          <button
            type="button"
            onClick={() => onToggleAll(!allAvailableChecked)}
            className="shrink-0 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors cursor-pointer"
          >
            {allAvailableChecked ? "Quitar todas" : "Marcar todas"}
          </button>
        )}
      </div>

      <div className="p-2 sm:p-4">
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {rows.map((row) => {
            const id = row.pedido_detalle_talla_id;
            const inputId = `${inputIdPrefix}-${id}`;
            const ceiling = ceilings.get(id) ?? 0;
            const agotada = ceiling <= 0;
            const checked = checkedIds.has(id);
            const sampleSku = workOrderLineSampleSku(row);
            const footer = renderRowFooter?.(row) ?? null;

            return (
              <div
                key={id}
                className={`py-3 px-2 rounded-lg transition-colors ${
                  agotada ? "opacity-60" : "hover:bg-slate-50 dark:hover:bg-white/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* El `<label>` envuelve SOLO la casilla y el texto de la
                      línea, nunca el input de cantidad: con la fila entera como
                      `<label>`, cada clic dentro del input de cantidad se
                      reenviaría a la casilla y desmarcaría la línea. */}
                  <label
                    htmlFor={inputId}
                    className={`flex min-w-0 flex-1 items-start gap-3 ${
                      agotada ? "cursor-not-allowed" : "cursor-pointer"
                    }`}
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={checked}
                      disabled={agotada}
                      onChange={() => onToggleLine(id)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-sky-600 shrink-0 disabled:cursor-not-allowed"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* SIN `truncate`: como flex item, `white-space: nowrap`
                            empujaría el input de cantidad fuera de la tarjeta en
                            nombres largos. */}
                        <p className="min-w-0 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {workOrderProductLabel(row)}
                        </p>
                        {row.talla_nombre && (
                          <span className="inline-flex items-center rounded-full bg-sky-50 dark:bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                            Talla {row.talla_nombre}
                          </span>
                        )}
                        {row.color_nombre && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {row.color_nombre}
                          </span>
                        )}
                        {agotada && (
                          <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            Ya programada
                          </span>
                        )}
                      </div>
                      {/* SKU de la MUESTRA. Las líneas de catálogo no lo pintan. */}
                      {sampleSku && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 break-words">
                          SKU:{" "}
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {sampleSku}
                          </span>
                        </p>
                      )}
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                        Pedida: {formatExactQuantityValue(row.cantidad_pedido)} ·
                        Programada: {formatExactQuantityValue(row.cantidad_asignada)} ·{" "}
                        <span
                          className={
                            agotada ? "" : "font-semibold text-slate-700 dark:text-slate-200"
                          }
                        >
                          Pendiente: {formatExactQuantityValue(row.cantidad_pendiente)}
                        </span>
                      </p>
                    </div>
                  </label>

                  {/* Una línea desmarcada queda inerte Y VACÍA —el hook borra su
                      cantidad al desmarcarla—, para que la tabla nunca muestre
                      piezas que no van a viajar en el payload. */}
                  <DecimalQuantityInput
                    value={quantities.get(id) ?? ""}
                    max={ceiling}
                    decimalPlaces={0}
                    disabled={agotada || !checked}
                    onChange={(next) => onQuantityChange(id, next)}
                    label={`Piezas a ${quantityVerb} de ${workOrderLineDescripcion(row)}`}
                  />
                </div>

                {/* El `pl-7` la alinea bajo el texto (ancho de la casilla + su
                    `gap-3`). */}
                {footer !== null && (
                  <div className="mt-1 flex flex-wrap items-center gap-2 pl-7">{footer}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
