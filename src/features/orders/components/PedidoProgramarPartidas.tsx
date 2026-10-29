"use client";

import type React from "react";
import { SectionTitle, textOrDash } from "@/src/components/DetailDialogPrimitives";
import {
  HelpIcon,
  PackageCheckIcon,
  PackageXIcon,
  WarehouseIcon,
} from "@/src/components/Icons";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { plural } from "@/src/utils/plural";
import { getPedidoProgramarServicioLabel } from "../constants/pedidoProgramacion";
import type { PedidoProgramarRenglon } from "../interfaces/pedido-programacion.interface";
import {
  getProgramarStockResumen,
  getProgramarTallasExcluidas,
  getTallaCoverage,
  getTallaDiferencia,
  groupRenglonesPorPartida,
  tieneStock,
  type PartidaCoverage,
  type ProgramarPartida,
} from "../utils/pedidoProgramarStock";

/** Por qué una talla no trae stock: el backend manda `null` en todos los casos. */
const sinStockMotivo = (renglon: PedidoProgramarRenglon): string =>
  renglon.es_muestra
    ? "Línea de muestra: no se surte del almacén."
    : "Sin existencia que consultar: la talla no tiene SKU de catálogo.";

type CoverageStyle = { card: string; row: string; badge: string; label: string; icon: string };

/** Estilos por cobertura (los de la revisión de inventario del PR #348, más "Sin medir"). */
const COVERAGE_STYLES: Record<PartidaCoverage, CoverageStyle> = {
  full: {
    card: "border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-900/10",
    row: "bg-emerald-50/40 dark:bg-emerald-900/10",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    label: "Cubierto",
    icon: "text-emerald-500",
  },
  partial: {
    card: "border-amber-200/70 bg-amber-50/40 dark:border-amber-500/20 dark:bg-amber-900/10",
    row: "bg-amber-50/40 dark:bg-amber-900/10",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    label: "Parcial",
    icon: "text-amber-500",
  },
  none: {
    card: "border-rose-200/70 bg-rose-50/40 dark:border-rose-500/20 dark:bg-rose-900/10",
    row: "bg-rose-50/40 dark:bg-rose-900/10",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    label: "Sin disponible",
    icon: "text-rose-500",
  },
  unmeasured: {
    card: "border-slate-200 bg-slate-50/60 dark:border-white/10 dark:bg-white/5",
    row: "",
    badge: "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300",
    label: "Sin medir",
    icon: "text-slate-400",
  },
};

/** Las partidas de muestra no tienen estado de cobertura: tarjeta neutra. */
const MUESTRA_STYLE: CoverageStyle = {
  card: "border-violet-200/70 bg-violet-50/30 dark:border-violet-500/20 dark:bg-violet-900/10",
  row: "",
  badge: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  label: "Muestra",
  icon: "text-violet-400",
};

const PARTIDA_ICONS: Record<PartidaCoverage, React.ComponentType<{ className?: string }>> = {
  full: PackageCheckIcon,
  partial: PackageXIcon,
  none: PackageXIcon,
  unmeasured: HelpIcon,
};

const TH = "py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400";
const DASH = <span className="text-slate-300 dark:text-slate-600">—</span>;

function PartidaCard({ partida }: { partida: ProgramarPartida }) {
  const styles = partida.coverage ? COVERAGE_STYLES[partida.coverage] : MUESTRA_STYLE;
  const ItemIcon = partida.coverage ? PARTIDA_ICONS[partida.coverage] : HelpIcon;
  const producto = textOrDash(partida.producto);

  return (
    <section
      className={`rounded-2xl border overflow-hidden ${styles.card}`}
      aria-label={`Partida ${producto}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <ItemIcon className={`w-4 h-4 shrink-0 ${styles.icon}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{producto}</p>
          {partida.color && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Color {partida.color}</p>
          )}
        </div>
        {partida.faltan > 0 && (
          <span className="rounded-full bg-white/80 dark:bg-black/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-300 tabular-nums">
            Faltan {formatQuantityValue(partida.faltan)}
          </span>
        )}
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${styles.badge}`}
        >
          {styles.label}
        </span>
        {/* Inerte a propósito: el flujo de producción aún no existe. */}
        {partida.faltan > 0 && (
          <label
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 cursor-not-allowed"
            title="Solicitar producción — próximamente"
          >
            <input
              type="checkbox"
              checked={false}
              disabled
              readOnly
              className="w-3.5 h-3.5 rounded border-slate-300 cursor-not-allowed"
            />
            Solicitar producción · Próximamente
          </label>
        )}
      </div>

      <div className="border-t border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-black/10 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-xs" aria-label={`Tallas de ${producto}`}>
          <thead>
            <tr className="bg-slate-50/80 dark:bg-white/5 border-b border-slate-200/70 dark:border-white/10">
              <th className={`${TH} text-left`}>Talla</th>
              <th className={`${TH} text-left`}>SKU</th>
              <th className={`${TH} text-left`}>Servicios</th>
              <th className={`${TH} text-right`}>Solicitado</th>
              <th className={`${TH} text-right`}>Disponible</th>
              <th className={`${TH} text-right`}>Diferencia</th>
              <th className={`${TH} text-left`}>Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {partida.renglones.map((renglon) => {
              const medida = tieneStock(renglon);
              const tallaStyles = medida ? COVERAGE_STYLES[getTallaCoverage(renglon)] : null;
              const diferencia = medida ? getTallaDiferencia(renglon) : null;
              const motivo = medida ? undefined : sinStockMotivo(renglon);
              return (
                <tr key={renglon.pedido_detalle_talla_id} className={`align-top ${tallaStyles?.row ?? ""}`}>
                  <td className="py-2 px-3 font-semibold text-slate-800 dark:text-white">
                    {renglon.talla}
                  </td>
                  <td className="py-2 px-3 text-slate-500 dark:text-slate-400">
                    {textOrDash(renglon.sku)}
                  </td>
                  <td className="py-2 px-3">
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
                  <td className="py-2 px-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                    {formatQuantityValue(renglon.cantidad)}
                  </td>
                  <td
                    className="py-2 px-3 text-right tabular-nums text-slate-700 dark:text-slate-200"
                    title={motivo}
                  >
                    {medida ? formatQuantityValue(renglon.stock_disponible) : DASH}
                  </td>
                  <td className="py-2 px-3 text-right" title={motivo}>
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
                  <td className="py-2 px-3" title={motivo}>
                    {tallaStyles ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${tallaStyles.badge}`}
                      >
                        {tallaStyles.label}
                      </span>
                    ) : (
                      DASH
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface PedidoProgramarPartidasProps {
  renglones: PedidoProgramarRenglon[];
  /** Código del almacén del que se surte (`almacen_surtido`), p. ej. "ALM-00". */
  almacenSurtido: string;
}

/**
 * Partidas del pedido con la cobertura de existencia de sus tallas, tal como
 * las da `GET /ventas/pedidos/{id}/programar/`: resumen en tres tarjetas
 * (cobertura, partidas cubiertas, piezas faltantes) y una tarjeta por partida
 * (`pedido_detalle_id`) con su estado, "Faltan N" y la tabla de tallas.
 *
 * El stock de cada talla llega ya calculado del backend; aquí solo se compara.
 * Las partidas de muestra no cuentan en el resumen; una partida con alguna
 * talla sin stock (`null`, no muestra) queda "Sin medir" y nunca cubierta.
 */
export function PedidoProgramarPartidas({ renglones, almacenSurtido }: PedidoProgramarPartidasProps) {
  const partidas = groupRenglonesPorPartida(renglones);
  const resumen = getProgramarStockResumen(partidas);
  const excluidas = getProgramarTallasExcluidas(renglones);
  const coverageTone =
    resumen?.percent === 100
      ? { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" }
      : (resumen?.percent ?? 0) >= 50
        ? { bar: "bg-amber-400", text: "text-amber-600 dark:text-amber-400" }
        : { bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" };

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-2">
        <SectionTitle>Partidas del pedido</SectionTitle>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Disponible por talla en <span className="font-semibold">{almacenSurtido}</span>,
          descontando lo reservado por otros pedidos.
        </p>
      </div>

      {/* Resumen: sin partidas de catálogo (vacío o solo muestras) no se pinta. */}
      {resumen && (
        <div className="mb-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Cobertura
            </p>
            {resumen.percent === null ? (
              <p
                className="text-2xl font-bold text-slate-400 dark:text-slate-500"
                title="Ninguna talla tiene existencia que medir"
              >
                —
              </p>
            ) : (
              <>
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
              </>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Partidas cubiertas
            </p>
            <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {resumen.partidasCubiertas}
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {" "}de {resumen.partidasTotal}
              </span>
            </p>
          </div>
          {/* Sin ninguna talla medida no hay faltante que afirmar: un "0" en
              verde diría que no falta nada. */}
          {resumen.percent === null ? (
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Piezas faltantes
              </p>
              <p
                className="text-2xl font-bold text-slate-400 dark:text-slate-500"
                title="Ninguna talla tiene existencia que medir"
              >
                —
              </p>
            </div>
          ) : (
            <div
              className={`rounded-2xl border px-4 py-3 ${
                resumen.piezasFaltantes > 0
                  ? "border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10"
                  : "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10"
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Piezas faltantes
              </p>
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
          )}
        </div>
      )}

      {(excluidas.sinMedir > 0 || excluidas.muestra > 0) && (
        <p className="mb-3 text-[11px] text-slate-500 dark:text-slate-400">
          Fuera del resumen:{" "}
          {[
            excluidas.sinMedir > 0 &&
              `${excluidas.sinMedir} ${plural(excluidas.sinMedir, "talla sin medir", "tallas sin medir")}, sin existencia que consultar (no se sabe si ${plural(excluidas.sinMedir, "está cubierta", "están cubiertas")})`,
            excluidas.muestra > 0 &&
              `${excluidas.muestra} ${plural(excluidas.muestra, "talla", "tallas")} de muestra`,
          ]
            .filter(Boolean)
            .join(" y ")}
          .
        </p>
      )}

      {partidas.length === 0 ? (
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
        <div className="space-y-2.5">
          {partidas.map((partida) => (
            <PartidaCard key={partida.id} partida={partida} />
          ))}
          {/* Afirmación de TODO el pedido: solo si todas las partidas de
              catálogo están cubiertas (una "Sin medir" no se puede comprobar). */}
          {resumen?.pedidoCubierto && (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2.5 border border-emerald-200/60 dark:border-emerald-700/30 leading-relaxed">
              Todas las partidas tienen existencia suficiente en {almacenSurtido}. No es necesario
              solicitar producción para este pedido.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
