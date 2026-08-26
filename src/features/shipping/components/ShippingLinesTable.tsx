"use client";

import { LayersIcon } from "@/src/components/Icons";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { shipmentLineProductoNombre } from "../hooks/useShippingForm";
import type { ShipmentOnboardingLine } from "../interfaces/shipping-onboarding.interface";

interface ShippingLinesTableProps {
  rows: ShipmentOnboardingLine[];
  checkedIds: Set<number>;
  availableRowsCount: number;
  selectedCount: number;
  onToggleLine: (packingDetalleId: number) => void;
  onToggleAll: (checked: boolean) => void;
}

/**
 * Tabla de líneas del packing elegido. La captura es una CASILLA por línea —
 * no hay cantidad que capturar: `DespachoDetalle` no tiene campo de cantidad,
 * despachar una línea es todo o nada (de ahí que no se reutilice el
 * `DecimalQuantityInput` de picking/packing).
 *
 * Las líneas ya despachadas se muestran DESHABILITADAS y etiquetadas, no
 * ocultas: son parte del contenido del packing y esconderlas haría parecer que
 * el packing tiene menos líneas de las que tiene. Mismo criterio que las
 * líneas sin pendiente de `PackingWizardStep2`.
 */
export function ShippingLinesTable({
  rows,
  checkedIds,
  availableRowsCount,
  selectedCount,
  onToggleLine,
  onToggleAll,
}: ShippingLinesTableProps) {
  const allAvailableChecked = availableRowsCount > 0 && selectedCount === availableRowsCount;

  return (
    <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
        <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm shrink-0">
          <LayersIcon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
            Líneas por enviar
          </h3>
          <p className="text-[11px] text-slate-500">
            {selectedCount === 0
              ? "Ninguna línea marcada"
              : `${selectedCount} de ${availableRowsCount} línea${
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
            const inputId = `shipping-line-${row.packing_detalle}`;
            const checked = checkedIds.has(row.packing_detalle);
            const disabled = !row.disponible_para_despacho;

            return (
              <label
                key={row.packing_detalle}
                htmlFor={inputId}
                className={`flex items-start gap-3 py-3 px-2 rounded-lg transition-colors ${
                  disabled
                    ? "opacity-60 cursor-not-allowed"
                    : "cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5"
                }`}
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onToggleLine(row.packing_detalle)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-sky-600 shrink-0 disabled:cursor-not-allowed"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {shipmentLineProductoNombre(row)}
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
                    {/* `ya_despachado` es una bandera irreversible: la línea ya
                        salió en otro despacho y el backend la rechazaría. Se
                        etiqueta explícitamente para que la casilla apagada no
                        se lea como un error de carga. */}
                    {row.ya_despachado && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        Ya enviada
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    {row.caja_numero !== null ? `Caja ${row.caja_numero}` : "Sin caja"} ·{" "}
                    {row.ubicacion_nombre ?? "Sin ubicación"} · Empacada:{" "}
                    {formatExactQuantityValue(row.cantidad_empacada)}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </section>
  );
}
