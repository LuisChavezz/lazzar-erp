"use client";

import { useState } from "react";
import { EmptyLines } from "@/src/components/DetailDialogPrimitives";
import { SheetSection } from "./OrderSheetPrimitives";
import { SpecialOrdersIcon } from "@/src/components/Icons";
import { RowProgressBar } from "@/src/components/ProgressPrimitives";
import { formatExactQuantityValue, safeParseAmount } from "@/src/utils/formatCurrency";
import { parsePercentageValue } from "@/src/utils/percentage";
import type { PedidoDetalleLinea } from "../interfaces/order.interface";
import { lineProductName } from "../utils/orderLines";
import { formatSku } from "@/src/utils/formatSku";

type Talla = PedidoDetalleLinea["tallas"][number];
type SizeState = "done" | "partial" | "none";

/**
 * Avance de la TALLA: el backend no lo da (solo el de la línea y el del
 * pedido), es surtido / pedido acotado a 100. Ambos lados son piezas de la
 * misma talla, así que un 100 sí significa "talla surtida".
 */
function sizeProgress(talla: Talla) {
  const surtida = safeParseAmount(talla.cantidad_surtida_picking);
  const avance = talla.cantidad > 0 ? Math.min(100, (surtida / talla.cantidad) * 100) : 0;
  const state: SizeState =
    talla.cantidad > 0 && surtida >= talla.cantidad ? "done" : surtida > 0 ? "partial" : "none";
  return { surtida, avance, state };
}

/** Surtido de la línea: el del backend si viene; si no, la suma de sus tallas. */
function lineSurtido(linea: PedidoDetalleLinea) {
  const t = linea.tracker_picking;
  if (t) {
    return {
      pct: parsePercentageValue(t.pct_surtido_linea),
      label: `${formatExactQuantityValue(t.total_surtido_linea)} / ${formatExactQuantityValue(t.total_prendas_linea)}`,
    };
  }
  const pedido = linea.tallas.reduce((sum, talla) => sum + talla.cantidad, 0);
  const surtido = linea.tallas.reduce((sum, talla) => sum + sizeProgress(talla).surtida, 0);
  return {
    pct: pedido > 0 ? Math.min(100, (surtido / pedido) * 100) : 0,
    label: `${formatExactQuantityValue(surtido)} / ${formatExactQuantityValue(pedido)}`,
  };
}

const SIZE_CHIP: Record<SizeState, string> = {
  done: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  partial: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  none: "bg-slate-50 text-slate-500 ring-slate-200 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10",
};
const SIZE_STATE_LABEL: Record<SizeState, string> = {
  done: "surtida",
  partial: "en proceso",
  none: "sin surtir",
};

/** Asignado y surtido de la línea, dentro de la fila abierta. */
function LinePickingTracker({ tracker }: { tracker: PedidoDetalleLinea["tracker_picking"] }) {
  if (!tracker) return null;

  const asignado = parsePercentageValue(tracker.pct_asignado_linea);
  const surtido = parsePercentageValue(tracker.pct_surtido_linea);
  const totalPrendas = formatExactQuantityValue(tracker.total_prendas_linea);

  return (
    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] flex flex-wrap items-center gap-x-8 gap-y-2 text-[11px]">
      <div className="flex items-center gap-2">
        <span className="text-slate-500 dark:text-slate-400 shrink-0">
          Asignado{" "}
          <span className="tabular-nums">
            ({formatExactQuantityValue(tracker.total_asignado_linea)} / {totalPrendas})
          </span>
        </span>
        <RowProgressBar percentage={asignado} complete={asignado >= 100} />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-slate-500 dark:text-slate-400 shrink-0">
          Surtido{" "}
          <span className="tabular-nums">
            ({formatExactQuantityValue(tracker.total_surtido_linea)} / {totalPrendas})
          </span>
        </span>
        <RowProgressBar percentage={surtido} complete={surtido >= 100} />
      </div>
    </div>
  );
}

function SizesTable({ tallas }: { tallas: Talla[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead className="bg-slate-50 dark:bg-white/5">
          <tr className="text-slate-500 dark:text-slate-400">
            <th className="px-3 py-2 text-left font-semibold">Talla</th>
            <th className="px-3 py-2 text-left font-semibold">Variante / SKU</th>
            <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
            <th className="px-3 py-2 text-right font-semibold">Asignado</th>
            <th className="px-3 py-2 text-right font-semibold">Surtido</th>
            <th className="px-3 py-2 text-right font-semibold">Avance</th>
          </tr>
        </thead>
        <tbody>
          {tallas.map((talla) => {
            const { avance, state } = sizeProgress(talla);
            return (
              <tr key={talla.id} className="border-t border-slate-100 dark:border-white/10 align-top">
                <td className="px-3 py-2 text-slate-700 dark:text-slate-200 whitespace-nowrap">
                  {talla.talla_nombre}
                </td>
                <td className="px-3 py-2">
                  <span className="block font-mono text-slate-600 dark:text-slate-300">
                    {talla.variante_sku ? <span title={talla.variante_sku}>{formatSku(talla.variante_sku)}</span> : "—"}
                  </span>
                  {talla.variante_nombre && (
                    <span className="block text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-52">
                      {talla.variante_nombre}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                  {talla.cantidad}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {formatExactQuantityValue(talla.cantidad_asignada_picking)}
                </td>
                <td
                  className={`px-3 py-2 text-right tabular-nums whitespace-nowrap ${
                    state === "done"
                      ? "font-semibold text-emerald-600 dark:text-emerald-400"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {formatExactQuantityValue(talla.cantidad_surtida_picking)}
                </td>
                <td className="px-3 py-2">
                  <RowProgressBar percentage={avance} complete={state === "done"} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Una línea (producto+color) plegable. Cerrada se lee de un vistazo: nombre,
 * piezas, barra de surtido y una ficha por talla pintada por estado. Abierta
 * muestra la tabla completa (SKU, asignado, surtido) — no se pierde nada.
 */
function LineRow({ linea }: { linea: PedidoDetalleLinea }) {
  const { pct, label } = lineSurtido(linea);
  const complete = pct >= 100;
  return (
    <details className="group rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
      <summary className="flex cursor-pointer list-none flex-col gap-2 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90"
            >
              <path fill="currentColor" d="M7.5 4.5 13 10l-5.5 5.5-1.4-1.4L10.2 10 6.1 5.9z" />
            </svg>
            <span className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
              {lineProductName(linea)}
            </span>
            {(linea.sku_base || linea.cod_proscai) && (
              <span className="shrink-0 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                {linea.sku_base && <span title={`SKU ${linea.sku_base}`}>{formatSku(linea.sku_base)}</span>}
                {linea.sku_base && linea.cod_proscai && <span aria-hidden="true"> · </span>}
                {linea.cod_proscai && <span title="SKU Proscai">Proscai {linea.cod_proscai}</span>}
              </span>
            )}
            {linea.color_nombre && (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 dark:border-white/10 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                {linea.color_codigo_hex && (
                  <span
                    className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10 dark:ring-white/10"
                    style={{ backgroundColor: linea.color_codigo_hex }}
                    aria-hidden="true"
                  />
                )}
                {linea.color_nombre}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400 tabular-nums">
              Surtido {label}
            </span>
            <div className="w-28">
              <RowProgressBar percentage={pct} complete={complete} />
            </div>
            <span className="w-14 text-right font-semibold tabular-nums text-slate-700 dark:text-slate-200">
              {linea.cantidad_total} pzas
            </span>
          </div>
        </div>
        {linea.tallas.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 pl-6" aria-label="Tallas">
            {linea.tallas.map((talla) => {
              const { surtida, state } = sizeProgress(talla);
              return (
                <li
                  key={talla.id}
                  title={`${talla.talla_nombre}: ${formatExactQuantityValue(surtida)} de ${talla.cantidad} (${SIZE_STATE_LABEL[state]})`}
                  className={`rounded px-1.5 py-px text-[10px] font-medium tabular-nums ring-1 ring-inset ${SIZE_CHIP[state]}`}
                >
                  {talla.talla_nombre}{" "}
                  <span className="opacity-70">
                    {formatExactQuantityValue(surtida)}/{talla.cantidad}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </summary>

      <div className="border-t border-slate-200 dark:border-white/10">
        <LinePickingTracker tracker={linea.tracker_picking} />
        {linea.tallas.length === 0 ? (
          <EmptyLines>Esta línea no tiene tallas.</EmptyLines>
        ) : (
          <SizesTable tallas={linea.tallas} />
        )}
      </div>
    </details>
  );
}

/**
 * Surtido por línea y por talla: lo pedido, lo asignado y lo surtido
 * (acumulado de TODOS los pickings del pedido — son parciales y repetibles).
 * Cada línea va plegada con su resumen; "Solo pendientes" esconde las líneas
 * ya surtidas para pedidos con muchas prendas.
 */
export function OrderPickingBySizeSection({ detalles }: { detalles: PedidoDetalleLinea[] }) {
  const [onlyPending, setOnlyPending] = useState(false);
  const completas = detalles.filter((linea) => lineSurtido(linea).pct >= 100).length;
  const visibles = onlyPending
    ? detalles.filter((linea) => lineSurtido(linea).pct < 100)
    : detalles;

  return (
    <SheetSection
      icon={<SpecialOrdersIcon className="w-5 h-5" />}
      title={`Surtido por producto y talla (${detalles.length})`}
      subtitle="Toca un producto para ver el detalle por talla."
      action={
        detalles.length > 1 && completas > 0 ? (
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={onlyPending}
              onChange={(event) => setOnlyPending(event.target.checked)}
              className="h-4 w-4 accent-sky-600"
            />
            Solo pendientes
          </label>
        ) : undefined
      }
    >
      {detalles.length === 0 ? (
        <EmptyLines>Este pedido no tiene líneas de producto.</EmptyLines>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {completas} de {detalles.length} producto{detalles.length === 1 ? "" : "s"} surtido
            {detalles.length === 1 ? "" : "s"}.
            <span className="ml-3 inline-flex items-center gap-3">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" />Surtida</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-500" />En proceso</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-slate-300 dark:bg-white/20" />Sin surtir</span>
            </span>
          </p>
          {visibles.length === 0 ? (
            <EmptyLines>Todo está surtido.</EmptyLines>
          ) : (
            visibles.map((linea) => <LineRow key={linea.id} linea={linea} />)
          )}
        </div>
      )}
    </SheetSection>
  );
}
