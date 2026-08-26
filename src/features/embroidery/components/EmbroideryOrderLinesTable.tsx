"use client";

import { DecimalQuantityInput } from "@/src/components/DecimalQuantityInput";
import { LayersIcon } from "@/src/components/Icons";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { embroideryLineProductoNombre } from "../hooks/useEmbroideryStep2Form";
import type { EmbroideryOnboardingDetalle } from "../interfaces/embroidery.interface";
import { EmbroideryLineLocationPopover } from "./EmbroideryLineLocationPopover";
import { ServiceChips } from "./ServiceChips";

interface EmbroideryOrderLinesTableProps {
  rows: EmbroideryOnboardingDetalle[];
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
 * Combina los dos precedentes del proyecto en lugar de inventar un tercero: la
 * casilla por línea con "Marcar/Quitar todas" y el renglón agotado deshabilitado
 * son de `ShippingLinesTable`; el input con techo por línea es el
 * `DecimalQuantityInput` de picking/packing, aquí con `decimalPlaces={0}` porque
 * las prendas se bordan enteras (`PedidoDetalleTalla.cantidad` es un
 * `PositiveIntegerField` y el backend rechaza fraccionarios con un 400).
 *
 * Las líneas SIN pendiente (`cantidad_pendiente <= 0`, ya cubiertas por órdenes
 * anteriores) se muestran deshabilitadas y etiquetadas «Ya programada», no
 * ocultas: forman parte del pedido, y esconderlas haría parecer que tiene menos
 * prendas de las que tiene. Mismo criterio que las líneas ya enviadas de
 * envío y las líneas sin pendiente de packing/picking.
 */
export function EmbroideryOrderLinesTable({
  rows,
  ceilings,
  checkedIds,
  quantities,
  availableRowsCount,
  selectedCount,
  onToggleLine,
  onToggleAll,
  onQuantityChange,
}: EmbroideryOrderLinesTableProps) {
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
            Prendas a bordar
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
            const inputId = `embroidery-line-${id}`;
            const ceiling = ceilings.get(id) ?? 0;
            const agotada = ceiling <= 0;
            const checked = checkedIds.has(id);
            // TODAS las ubicaciones, no `ubicaciones[0]`. Este renglón se
            // quedaba con la primera "porque ninguna talla real trae más de
            // una": es falso. Entre las tallas CON bordado la distribución es
            // `{0: 1, 1: 47, 2: 4}` —las cuatro de dos son de P-00027-2026,
            // códigos `["B", "A"]` e imagen distinta cada una—, así que el
            // corte escondía un bordado entero al programar la orden.
            //
            // El arreglo puede venir VACÍO (esa única talla con `{0}`), y por
            // eso se comprueba `length` antes de abrir el popover en vez de
            // confiar en el índice: el proyecto no activa
            // `noUncheckedIndexedAccess`, así que TypeScript no exigiría la
            // comprobación por su cuenta.
            //
            // La cardinalidad NO cambia: varias ubicaciones son varios bordados
            // sobre la MISMA prenda, así que siguen siendo una sola fila y una
            // sola línea de `detalles_override`.
            const { ubicaciones } = row;

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
                        {embroideryLineProductoNombre(row)}
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
                      Pedida: {formatExactQuantityValue(row.cantidad_pedido)} · Programada:{" "}
                      {formatExactQuantityValue(row.cantidad_asignada)} ·{" "}
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

                {/* `decimalPlaces={0}`: piezas enteras. El techo es el pendiente
                    de ESTA línea. Una línea desmarcada queda inerte Y VACÍA —el
                    hook borra su cantidad al desmarcarla—, para que la tabla
                    nunca muestre piezas que no van a viajar en el payload. */}
                <DecimalQuantityInput
                  value={quantities.get(id) ?? ""}
                  max={ceiling}
                  decimalPlaces={0}
                  disabled={agotada || !checked}
                  onChange={(next) => onQuantityChange(id, next)}
                  label={`Piezas a bordar de ${embroideryLineProductoNombre(row)}`}
                />
                </div>

                {/* Segunda línea de la fila, FUERA del `<label>` de arriba: el
                    disparador del popover es un `<button>` y, dentro de una
                    etiqueta, cada clic suyo se reenviaría a la casilla y
                    desmarcaría la línea que el usuario quiere inspeccionar
                    —exactamente el motivo por el que el stepper tampoco está
                    ahí dentro—. El `pl-7` la alinea bajo el texto (ancho de la
                    casilla + su `gap-3`).

                    Sin NINGUNA ubicación capturada no hay nada que abrir: se cae
                    a la etiqueta plana de siempre, sin botón ni popover vacío.

                    El disparador es UNO por fila aunque haya varias
                    ubicaciones: son varios bordados de la misma prenda, no
                    varias prendas. Su propio texto ya enumera los códigos
                    ("Posiciones: B, A"), así que la fila comunica que hay más
                    de uno sin abrirlo — ver `EmbroideryLineLocationPopover`. */}
                {(ubicaciones.length > 0 || row.posicion_sugerida) && (
                  <div className="mt-1 flex flex-wrap items-center gap-2 pl-7">
                    {ubicaciones.length > 0 ? (
                      <>
                        <EmbroideryLineLocationPopover
                          ubicaciones={ubicaciones}
                          productoNombre={embroideryLineProductoNombre(row)}
                          // Talla y color distinguen filas que comparten producto
                          // —lo normal en un pedido—: sin ellos, el nombre
                          // accesible de los disparadores sería idéntico en todas.
                          tallaNombre={row.talla_nombre}
                          colorNombre={row.color_nombre}
                          posicionLabel={row.posicion_sugerida}
                        />
                        {/* Distintivo redundante A PROPÓSITO con el texto del
                            disparador: al programar la orden, "esta prenda
                            lleva 2 bordados" cambia el trabajo que se manda al
                            taller, y no debe depender de que alguien lea una
                            lista de códigos dentro de un botón. Solo aparece
                            cuando de verdad hay más de una. */}
                        {ubicaciones.length > 1 && (
                          <span className="inline-flex items-center rounded-full bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                            {ubicaciones.length} bordados
                          </span>
                        )}
                      </>
                    ) : (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        Posición: {row.posicion_sugerida}
                      </p>
                    )}
                  </div>
                )}

                {/* Técnicas de la línea, en su PROPIA fila y no dentro del
                    bloque de posiciones de arriba: aquél está condicionado a que
                    haya ubicaciones capturadas, y una línea puede traer
                    servicios sin ellas. Fuera del `<label>` por el mismo motivo
                    que el popover —los chips no deben desmarcar la casilla— y
                    con el mismo `pl-7` para alinearse bajo el texto.

                    Es un ANTICIPO de solo lectura: se ve mientras se decide la
                    cantidad, no se edita aquí. Lo que la orden acabe mostrando
                    lo resuelve el backend al crearla. */}
                <div className="mt-1 flex flex-wrap items-center gap-2 pl-7">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    Servicios:
                  </span>
                  <ServiceChips servicios={row.tipos_servicio_display} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
