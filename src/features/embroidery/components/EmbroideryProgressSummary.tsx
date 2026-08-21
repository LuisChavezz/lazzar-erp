"use client";

import {
  Section,
  EmptyLines,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { CheckIcon } from "@/src/components/Icons";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { buildEmbroiderySkuLabel } from "../utils/embroiderySkuLabel";
import { resolveEmbroideryLineUbicaciones } from "../utils/resolveEmbroideryLineUbicaciones";
import { EmbroideryLineLocationPopover } from "./EmbroideryLineLocationPopover";
import type {
  EmbroideryOrderDetailLine,
  ResumenAvance,
  ResumenAvancePorDetalle,
} from "../interfaces/embroidery.interface";

interface EmbroideryProgressSummaryProps {
  resumenAvance: ResumenAvance;
  /**
   * Renglones de la orden. `por_detalle` NO trae las ubicaciones del bordado
   * (solo el escalar `posicion_bordado`), así que la celda de posición cruza
   * cada fila con su renglón por id para poder abrir el popover con imágenes.
   */
  detalles: EmbroideryOrderDetailLine[];
}

/**
 * Tarjeta métrica. Con `total` se lee "hecho / total"; sin él, solo la cifra.
 * `hint` cuelga un dato secundario debajo, para no gastar una tarjeta entera en
 * una cifra que solo tiene sentido junto a la principal.
 */
const MetricCard = ({
  label,
  done,
  total,
  hint,
}: {
  label: string;
  done: string;
  total?: string;
  hint?: string;
}) => (
  <div className="rounded-xl border border-slate-100 dark:border-white/10 px-4 py-3">
    <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
      {label}
    </p>
    <p className="mt-1 text-lg font-semibold tabular-nums text-slate-800 dark:text-white">
      {done}
      {total !== undefined && (
        <span className="text-sm font-normal text-slate-400 dark:text-slate-500">
          {" "}
          / {total}
        </span>
      )}
    </p>
    {hint !== undefined && (
      <p className="mt-0.5 text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
        {hint}
      </p>
    )}
  </div>
);

const isLegacyRow = (row: ResumenAvancePorDetalle) =>
  row.orden_bordado_detalle_id === null;

const isCompleteRow = (row: ResumenAvancePorDetalle) =>
  row.cantidad_programada > 0 && row.porcentaje_avance >= 100;

/** Operadores de un renglón, como "María (25), Luis (15)"; "—" si no hay. */
const operadoresLabel = (row: ResumenAvancePorDetalle): string => {
  if (row.operadores.length === 0) return "—";
  return row.operadores
    .map((op) => `${op.usuario_nombre} (${formatQuantityValue(op.cantidad_bordada)})`)
    .join(", ");
};

/** Barra de progreso pequeña por renglón + porcentaje. */
const RowProgress = ({ row }: { row: ResumenAvancePorDetalle }) => {
  // Sin programado no hay porcentaje que enunciar (fila legacy).
  if (row.cantidad_programada <= 0) {
    return <span className="text-slate-400 dark:text-slate-500">—</span>;
  }
  const width = Math.min(100, Math.max(0, row.porcentaje_avance));
  const complete = isCompleteRow(row);
  return (
    <span className="flex items-center justify-end gap-2">
      <span className="h-1.5 w-16 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
        <span
          className={`block h-full rounded-full ${complete ? "bg-emerald-500" : "bg-sky-500"}`}
          style={{ width: `${width}%` }}
        />
      </span>
      <span
        className={`tabular-nums font-semibold ${
          complete
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-slate-700 dark:text-slate-200"
        }`}
      >
        {formatQuantityValue(row.porcentaje_avance)}%
      </span>
      {complete && (
        <CheckIcon
          className="w-3.5 h-3.5 text-emerald-500 shrink-0"
          aria-label="Completado"
        />
      )}
    </span>
  );
};

/**
 * Resumen de avance de la orden: dos tarjetas globales (piezas y puntadas
 * totales, ésta con el promedio de puntadas por pieza de subrótulo) +
 * barra de progreso general, y debajo el desglose POR RENGLÓN (talla/SKU) con
 * los operadores que aportaron a cada uno.
 *
 * Los totales vienen directos de `resumen_avance` — el backend corrigió el bug
 * de `cantidad_programada`/`puntadas_presupuesto` en 0 cuando no hay avances,
 * así que ya no se reconstruyen desde `detalles`.
 *
 * Orden del desglose: renglones INCOMPLETOS primero, luego los completos; la
 * fila legacy (avances sin talla asignada) siempre al final.
 */
export function EmbroideryProgressSummary({
  resumenAvance,
  detalles,
}: EmbroideryProgressSummaryProps) {
  const pctWidth = Math.min(100, Math.max(0, resumenAvance.porcentaje_avance));

  // Índice por id del renglón, para que la celda de posición no recorra
  // `detalles` en cada fila. La fila legacy (`orden_bordado_detalle_id: null`)
  // no cruza con nada y cae al texto plano, que es lo correcto: no hay renglón
  // del que sacar ubicaciones.
  const detallesById = new Map(detalles.map((linea) => [linea.id, linea]));

  const rows = [...resumenAvance.por_detalle].sort((a, b) => {
    if (isLegacyRow(a) !== isLegacyRow(b)) return isLegacyRow(a) ? 1 : -1;
    return (isCompleteRow(a) ? 1 : 0) - (isCompleteRow(b) ? 1 : 0);
  });

  return (
    <Section title="Resumen de avance">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Piezas bordadas"
          done={formatQuantityValue(resumenAvance.cantidad_bordada_total)}
          total={formatQuantityValue(resumenAvance.cantidad_programada)}
        />
        {/* `puntadas_total` —Σ (puntadas por pieza × piezas) de cada avance— y
            no el viejo `puntadas_realizadas`, el contador manual de la máquina
            que dejó de capturarse. Sin respaldo al campo viejo: las órdenes
            anteriores a este seguimiento marcan 0, que es lo cierto (nunca se
            registró el ponchado), y mezclar las dos fuentes daría un total que
            no cuadra con la suma de la tabla de abajo.

            SIN denominador, como antes: `puntadas_presupuesto` no es
            comparable. El backend lo calcula como Σ`detalles[].puntadas`, el
            conteo de UNA prenda, así que presentarlo como fracción daba
            lecturas sin sentido ("400,000 / 8,000") y, sin el dato capturado,
            un "16 / 0". El % de avance va por piezas. */}
        <MetricCard
          label="Puntadas totales"
          done={formatQuantityValue(resumenAvance.puntadas_total)}
          // El promedio solo dice algo acompañando al total —es su otro factor,
          // junto a las piezas—, así que va de subrótulo y no de tarjeta
          // propia. Se omite cuando llega en 0: sin puntadas capturadas, un
          // "0 punt/pieza" es ruido, no información.
          hint={
            resumenAvance.puntadas_por_pieza_promedio > 0
              ? `${formatQuantityValue(resumenAvance.puntadas_por_pieza_promedio)} punt/pieza en promedio`
              : undefined
          }
        />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-500 dark:text-slate-400">Avance general</span>
          <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-200">
            {formatQuantityValue(resumenAvance.porcentaje_avance)}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${pctWidth}%` }}
          />
        </div>
      </div>

      {/* Desglose por talla/SKU */}
      <div className="mt-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
          Avance por talla
        </p>
        {rows.length === 0 ? (
          <EmptyLines>Esta orden no tiene renglones.</EmptyLines>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 dark:bg-white/5">
                <tr className="text-slate-500 dark:text-slate-400">
                  <th className="px-3 py-2 text-left font-semibold">Talla / SKU</th>
                  <th className="px-3 py-2 text-left font-semibold">Posición</th>
                  <th className="px-3 py-2 text-right font-semibold">Programado</th>
                  <th className="px-3 py-2 text-right font-semibold">Bordado</th>
                  {/* Desglose de la tarjeta "Puntadas totales": sin esta
                      columna, el total de la orden no se podía auditar por
                      talla. NO se añade el promedio de puntadas por pieza —la
                      tabla ya carga seis columnas y ese dato se lee en la
                      tarjeta—. */}
                  <th className="px-3 py-2 text-right font-semibold">Punt total</th>
                  <th className="px-3 py-2 text-right font-semibold">% Avance</th>
                  <th className="px-3 py-2 text-left font-semibold">Operadores</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const legacy = isLegacyRow(row);
                  // Mismo criterio que la tabla de artículos que este desglose
                  // sustituyó: se prefiere `configuracion` (la foto congelada al
                  // emitir la orden) sobre la lectura en vivo del pedido — ver
                  // `resolveEmbroideryLineUbicaciones`.
                  const detalle =
                    row.orden_bordado_detalle_id !== null
                      ? detallesById.get(row.orden_bordado_detalle_id)
                      : undefined;
                  const ubicaciones = detalle
                    ? resolveEmbroideryLineUbicaciones(detalle)
                    : [];
                  return (
                    <tr
                      key={row.orden_bordado_detalle_id ?? `legacy-${index}`}
                      className="border-t border-slate-100 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <td
                        className={`px-3 py-2 ${
                          legacy
                            ? "italic text-slate-400 dark:text-slate-500"
                            : "text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        {buildEmbroiderySkuLabel(row)}
                      </td>
                      <td className="px-3 py-2">
                        {ubicaciones.length > 0 && detalle ? (
                          <span className="flex flex-wrap items-center gap-1.5">
                            <EmbroideryLineLocationPopover
                              ubicaciones={ubicaciones}
                              productoNombre={
                                row.producto_nombre ??
                                `Producto #${detalle.producto}`
                              }
                              tallaNombre={row.talla_nombre}
                              colorNombre={row.color_nombre}
                              posicionLabel={row.posicion_bordado}
                            />
                            {/* `posicion_bordado` SIEMPRE describe solo la
                                primera ubicación, así que sin este contador una
                                línea de dos bordados se leería como de uno. */}
                            {ubicaciones.length > 1 && (
                              <span className="inline-flex items-center rounded-full bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                                {ubicaciones.length} bordados
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400">
                            {textOrDash(row.posicion_bordado)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                        {row.cantidad_programada > 0
                          ? formatQuantityValue(row.cantidad_programada)
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                        {formatQuantityValue(row.cantidad_bordada)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                        {formatQuantityValue(row.puntadas_total)}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <RowProgress row={row} />
                      </td>
                      <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                        {operadoresLabel(row)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Section>
  );
}
