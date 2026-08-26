"use client";

import { DecimalQuantityInput } from "@/src/components/DecimalQuantityInput";
import { LayersIcon } from "@/src/components/Icons";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { reflectiveLineProductoNombre } from "../hooks/useReflectiveStep2Form";
import type { ReflectiveOnboardingDetalle } from "../interfaces/reflective-order.interface";
import {
  ReflectiveConfigCountBadge,
  ReflectiveLineConfigPopover,
} from "./ReflectiveLineConfigPopover";

interface ReflectiveOrderLinesTableProps {
  rows: ReflectiveOnboardingDetalle[];
  /** Techo por línea (`cantidad_pendiente` truncado a entero), por id. */
  ceilings: Map<number, number>;
  checkedIds: Set<number>;
  /** Cantidad capturada por id. Una línea desmarcada NO tiene entrada. */
  quantities: Map<number, string>;
  availableRowsCount: number;
  selectedCount: number;
  onToggleLine: (pedidoDetalleTallaId: number) => void;
  onToggleAll: (checked: boolean) => void;
  onQuantityChange: (pedidoDetalleTallaId: number, value: string) => void;
}

/**
 * Tabla de prendas del pedido elegido: una casilla POR LÍNEA más la cantidad de
 * piezas que entran en esta orden.
 *
 * Gemela de `EmbroideryOrderLinesTable`, con su misma segunda fila: el
 * disparador del popover de configuración (`ReflectiveLineConfigPopover`) más el
 * distintivo de conteo cuando la línea lleva varios reflejantes. Cada elemento
 * de `reflejante_config` es un reflejante (material + posición); el arreglo trae
 * de uno a tres, y P-00027 mezcla dos materiales en la misma prenda.
 *
 * El disparador es UNO por fila aunque el config sea UNIFORME entre las líneas
 * del pedido: sí, es el mismo dato en todas sus tallas, pero va colapsado en un
 * trigger compacto y mantiene la fila autoexplicativa —el operador ve qué se
 * aplica en la línea que está programando sin buscar un encabezado compartido—.
 * La cardinalidad NO cambia: varios reflejantes son una sola línea.
 *
 * Combina los dos precedentes del proyecto en lugar de inventar un tercero: la
 * casilla por línea con "Marcar/Quitar todas" y el renglón agotado deshabilitado
 * son de `ShippingLinesTable`; el input con techo por línea es el
 * `DecimalQuantityInput` de picking/packing, aquí con `decimalPlaces={0}` porque
 * las prendas se reflejan enteras (`PedidoDetalleTalla.cantidad` es un
 * `PositiveIntegerField` y el backend rechaza fraccionarios con un 400).
 *
 * Las líneas SIN pendiente (`cantidad_pendiente <= 0`, ya cubiertas por órdenes
 * anteriores) se muestran deshabilitadas y etiquetadas «Ya programada», no
 * ocultas: forman parte del pedido, y esconderlas haría parecer que tiene menos
 * prendas de las que tiene.
 */
export function ReflectiveOrderLinesTable({
  rows,
  ceilings,
  checkedIds,
  quantities,
  availableRowsCount,
  selectedCount,
  onToggleLine,
  onToggleAll,
  onQuantityChange,
}: ReflectiveOrderLinesTableProps) {
  const allAvailableChecked =
    availableRowsCount > 0 && selectedCount === availableRowsCount;

  return (
    <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
        <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm shrink-0">
          <LayersIcon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
            Prendas a reflejar
          </h3>
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
            const inputId = `reflective-line-${id}`;
            const ceiling = ceilings.get(id) ?? 0;
            const agotada = ceiling <= 0;
            const checked = checkedIds.has(id);
            // Los reflejantes de la línea, del onboarding (lectura en vivo del
            // pedido; en el alta todavía no hay orden que congelar). Puede venir
            // `null`/vacío: la fila cae a mostrar solo cantidades, sin popover.
            const configs = row.reflejante_config ?? [];

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
                      reenviaría a la casilla y desmarcaría la línea que el
                      usuario está intentando editar. */}
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
                            fija el min-content al ancho completo del texto y
                            empujaría el input de cantidad fuera de la tarjeta en
                            nombres largos. Con `min-w-0` + `break-words` el
                            nombre envuelve y la fila crece de alto. */}
                        <p className="min-w-0 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {reflectiveLineProductoNombre(row)}
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
                        {/* Sin esta etiqueta, la casilla apagada de una línea ya
                            cubierta se leería como un error de carga. */}
                        {agotada && (
                          <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            Ya programada
                          </span>
                        )}
                      </div>
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

                  {/* `decimalPlaces={0}`: piezas enteras. El techo es el
                      pendiente de ESTA línea. Una línea desmarcada queda inerte
                      Y VACÍA —el hook borra su cantidad al desmarcarla—, para
                      que la tabla nunca muestre piezas que no van a viajar en el
                      payload. */}
                  <DecimalQuantityInput
                    value={quantities.get(id) ?? ""}
                    max={ceiling}
                    decimalPlaces={0}
                    disabled={agotada || !checked}
                    onChange={(next) => onQuantityChange(id, next)}
                    label={`Piezas a reflejar de ${reflectiveLineProductoNombre(row)}`}
                  />
                </div>

                {/* Segunda fila, FUERA del `<label>` de arriba: el disparador es
                    un `<button>` y, dentro de una etiqueta, cada clic suyo se
                    reenviaría a la casilla y desmarcaría la línea que el usuario
                    quiere inspeccionar. El `pl-7` la alinea bajo el texto (ancho
                    de la casilla + su `gap-3`). Sin config no hay nada que abrir:
                    no se pinta ni el botón ni un popover vacío. */}
                {configs.length > 0 && (
                  <div className="mt-1 flex flex-wrap items-center gap-2 pl-7">
                    <ReflectiveLineConfigPopover
                      configs={configs}
                      productoNombre={reflectiveLineProductoNombre(row)}
                      // Talla y color distinguen filas que comparten producto;
                      // sin ellos el nombre accesible sería idéntico en todas.
                      tallaNombre={row.talla_nombre}
                      colorNombre={row.color_nombre}
                    />
                    <ReflectiveConfigCountBadge configs={configs} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
