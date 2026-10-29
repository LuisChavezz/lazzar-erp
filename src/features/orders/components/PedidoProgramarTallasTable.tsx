"use client";

import {
  LineItemsTable,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { FactoryIcon, WarehouseIcon } from "@/src/components/Icons";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { getPedidoProgramarServicioLabel } from "../constants/pedidoProgramacion";
import type { PedidoProgramarRenglon } from "../interfaces/pedido-programacion.interface";
import {
  getProgramarStockResumen,
  getTallaCoverage,
  getTallaDiferencia,
  tieneStock,
  type TallaCoverage,
} from "../utils/pedidoProgramarStock";

/** Por qué una talla no trae stock: el backend manda `null` en ambos casos. */
const sinStockMotivo = (renglon: PedidoProgramarRenglon): string =>
  renglon.es_muestra
    ? "Línea de muestra: no se surte del almacén."
    : "La talla no tiene SKU de catálogo: no hay existencia que consultar.";

/** Estilos por cobertura de la talla (los de la antigua revisión de inventario). */
const COVERAGE_STYLES: Record<TallaCoverage, { row: string; badge: string; label: string }> = {
  full: {
    row: "bg-emerald-50/40 dark:bg-emerald-900/10",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    label: "Cubierto",
  },
  partial: {
    row: "bg-amber-50/40 dark:bg-amber-900/10",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    label: "Parcial",
  },
  none: {
    row: "bg-rose-50/40 dark:bg-rose-900/10",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    label: "Sin existencia",
  },
};

const TH = "px-3 py-2 text-[10px] font-semibold uppercase tracking-wider";
const DASH = <span className="text-slate-300 dark:text-slate-600">—</span>;

interface PedidoProgramarTallasTableProps {
  renglones: PedidoProgramarRenglon[];
  /** Código del almacén del que se surte (`almacen_surtido`), p. ej. "ALM-00". */
  almacenSurtido: string;
}

/**
 * Tallas del pedido con sus servicios y su cobertura de existencia, tal como
 * las da `GET /ventas/pedidos/{id}/programar/`: resumen en tres tarjetas
 * (cobertura, tallas cubiertas, piezas faltantes) y tabla por talla con
 * diferencia y estado. Las tallas de muestra o sin SKU (`stock_disponible`
 * `null`) se listan con "—" y quedan fuera de toda la cuenta.
 */
export function PedidoProgramarTallasTable({
  renglones,
  almacenSurtido,
}: PedidoProgramarTallasTableProps) {
  const resumen = getProgramarStockResumen(renglones);
  const tallasSinMedir = renglones.length - (resumen?.tallasMedidas ?? 0);
  const coverageTone = resumen?.fullyCovered
    ? { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" }
    : (resumen?.percent ?? 0) >= 50
      ? { bar: "bg-amber-400", text: "text-amber-600 dark:text-amber-400" }
      : { bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" };

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-2">
        <SectionTitle>Tallas del pedido</SectionTitle>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Stock disponible en <span className="font-semibold">{almacenSurtido}</span>,
          descontando lo reservado por otros pedidos.
        </p>
      </div>

      {/* Resumen: sin tallas con stock que medir (vacío o solo muestras/sin SKU) no se pinta. */}
      {resumen && (
        <div className="mb-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Cobertura
              </p>
              <p className={`text-2xl font-bold tabular-nums ${coverageTone.text}`}>
                {resumen.percent}%
              </p>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${coverageTone.bar}`}
                  style={{ width: `${resumen.percent}%` }}
                  role="progressbar"
                  aria-valuenow={resumen.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Cobertura de existencia: ${resumen.percent}%`}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tallas cubiertas
              </p>
              <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {resumen.tallasCubiertas}
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {" "}de {resumen.tallasMedidas}
                </span>
              </p>
            </div>
            <div
              className={`rounded-2xl border px-4 py-3 ${
                resumen.piezasFaltantes > 0
                  ? "border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10"
                  : "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Piezas faltantes
                </p>
                {/* Visible pero inerte: el flujo de producción aún no existe. */}
                {resumen.piezasFaltantes > 0 && (
                  <button
                    type="button"
                    disabled
                    title="Solicitar producción — próximamente"
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 cursor-not-allowed"
                  >
                    <FactoryIcon className="w-3 h-3" aria-hidden="true" />
                    Próximamente
                  </button>
                )}
              </div>
              <p
                className={`text-2xl font-bold tabular-nums ${
                  resumen.piezasFaltantes > 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {formatQuantityValue(resumen.piezasFaltantes)}
              </p>
            </div>
          </div>
          {tallasSinMedir > 0 && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {tallasSinMedir === 1
                ? "1 talla de muestra o sin SKU no entra en el resumen."
                : `${tallasSinMedir} tallas de muestra o sin SKU no entran en el resumen.`}
            </p>
          )}
        </div>
      )}

      {renglones.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 p-6 text-center">
          <WarehouseIcon
            className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-3"
            aria-hidden="true"
          />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Este pedido no tiene tallas
          </p>
        </div>
      ) : (
        <>
          <LineItemsTable
            head={
              <>
                <th className={TH}>Producto</th>
                <th className={TH}>Talla</th>
                <th className={TH}>SKU</th>
                <th className={TH}>Servicios</th>
                <th className={`${TH} text-right`}>Solicitado</th>
                <th className={`${TH} text-right`}>Stock disp.</th>
                <th className={`${TH} text-right`}>Diferencia</th>
                <th className={`${TH} text-right`}>Faltante</th>
                <th className={TH}>Estado</th>
              </>
            }
          >
            {renglones.map((renglon) => {
              const medida = tieneStock(renglon);
              const styles = medida ? COVERAGE_STYLES[getTallaCoverage(renglon)] : null;
              const diferencia = medida ? getTallaDiferencia(renglon) : null;
              const faltante = renglon.faltante ?? 0;
              const motivo = medida ? undefined : sinStockMotivo(renglon);
              return (
                <tr key={renglon.pedido_detalle_talla_id} className={`text-xs align-top ${styles?.row ?? ""}`}>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                    <p className="font-semibold text-slate-800 dark:text-white">
                      {textOrDash(renglon.producto)}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {textOrDash(renglon.color)}
                      {renglon.es_muestra && (
                        <span className="ml-1.5 rounded-full bg-violet-100 dark:bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                          Muestra
                        </span>
                      )}
                    </p>
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-800 dark:text-white">
                    {renglon.talla}
                  </td>
                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                    {textOrDash(renglon.sku)}
                  </td>
                  <td className="px-3 py-2">
                    {renglon.servicios.length === 0 ? (
                      DASH
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {renglon.servicios.map((servicio) => (
                          <span
                            key={servicio}
                            className="rounded-full bg-sky-50 dark:bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300"
                          >
                            {getPedidoProgramarServicioLabel(servicio)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">
                    {formatQuantityValue(renglon.cantidad)}
                  </td>
                  <td
                    className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200"
                    title={motivo}
                  >
                    {medida ? formatQuantityValue(renglon.stock_disponible) : DASH}
                  </td>
                  <td className="px-3 py-2 text-right" title={motivo}>
                    {diferencia === null ? (
                      DASH
                    ) : (
                      <span
                        className={`tabular-nums font-bold ${
                          diferencia > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : diferencia < 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {diferencia > 0 ? "+" : ""}
                        {formatQuantityValue(diferencia)}
                      </span>
                    )}
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${
                      faltante > 0
                        ? "font-semibold text-rose-600 dark:text-rose-400"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                    title={motivo}
                  >
                    {renglon.faltante === null ? DASH : formatQuantityValue(renglon.faltante)}
                  </td>
                  <td className="px-3 py-2" title={motivo}>
                    {styles ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles.badge}`}
                      >
                        {styles.label}
                      </span>
                    ) : (
                      DASH
                    )}
                  </td>
                </tr>
              );
            })}
          </LineItemsTable>
          {resumen?.fullyCovered && (
            <p className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2.5 border border-emerald-200/60 dark:border-emerald-700/30 leading-relaxed">
              Todas las tallas con SKU tienen existencia suficiente en {almacenSurtido}. No es
              necesario solicitar producción para este pedido.
            </p>
          )}
        </>
      )}
    </section>
  );
}
