"use client";

import type React from "react";
import { useState } from "react";
import { SectionTitle, textOrDash } from "@/src/components/DetailDialogPrimitives";
import {
  ChevronDownIcon,
  HelpIcon,
  PackageCheckIcon,
  PackageXIcon,
  SpecialOrdersIcon,
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

/** Cifra de una tarjeta del resumen cuando ninguna talla tiene existencia que medir. */
const SIN_MEDIDA = (
  <p className="text-2xl font-bold" title="Ninguna talla tiene existencia que medir">
    {DASH}
  </p>
);

/** Una talla sin SKU aún no puede surtirse. */
const partidaSinSku = (partida: ProgramarPartida): boolean =>
  partida.renglones.some((renglon) => !renglon.sku?.trim());

/** Lo que el operario aún tiene que resolver: se abre sola y entra en la barra de pendientes. */
const partidaRequiereAtencion = (partida: ProgramarPartida): boolean =>
  partidaSinSku(partida) || partida.faltan > 0;

const partidaDomId = (id: number) => `programar-partida-${id}`;

/**
 * `numero` es la posición de la partida en el orden del GET: con el mismo
 * producto y color en varias partidas, es lo único que las distingue.
 */
function PartidaCard({
  partida,
  numero,
  open,
  onToggle,
}: {
  partida: ProgramarPartida;
  numero: number;
  open: boolean;
  onToggle: () => void;
}) {
  const styles = partida.coverage ? COVERAGE_STYLES[partida.coverage] : MUESTRA_STYLE;
  // La muestra lleva el ícono de pedidos especiales; `HelpIcon` queda para "Sin medir".
  const ItemIcon = partida.coverage ? PARTIDA_ICONS[partida.coverage] : SpecialOrdersIcon;
  const producto = textOrDash(partida.producto);
  // Cerrada se lee el nombre corto; abierta, la descripción completa.
  const productoCerrado = partida.productoCorto ?? producto;
  // Una talla sin SKU aún no puede surtirse: se avisa en la tarjeta y en la talla.
  const sinSku = partidaSinSku(partida);
  // Sin ninguna talla medida (muestras, sin SKU) las columnas de existencia solo
  // tendrían guiones: se ocultan.
  const conExistencia = partida.renglones.some(tieneStock);
  const resumenTallas = partida.renglones
    .map((renglon) => `${renglon.talla} ${formatQuantityValue(renglon.cantidad)}`)
    .join(" · ");
  const partidaLabel = [`Partida ${numero}`, producto, partida.color].filter(Boolean).join(" · ");

  return (
    <section
      id={partidaDomId(partida.id)}
      className={`rounded-2xl border overflow-hidden scroll-mt-4 ${styles.card}`}
      aria-label={partidaLabel}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2">
        {/* Abrir la partida muestra la descripción completa y sus tallas. */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="group flex min-w-0 flex-1 items-center gap-3 text-left rounded-lg -mx-1 px-1 py-0.5 focus-visible:outline-2 focus-visible:outline-sky-500 cursor-pointer"
        >
          <ItemIcon className={`w-4 h-4 shrink-0 ${styles.icon}`} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span
              className={`block text-xs font-semibold text-slate-700 dark:text-slate-200 ${
                open ? "wrap-break-word" : "truncate"
              }`}
              title={open ? undefined : producto}
            >
              <span className="mr-1.5 text-slate-400 dark:text-slate-500 tabular-nums">
                Partida {numero}
              </span>
              {partida.categoria && (
                <span className="mr-1.5 inline-flex items-center rounded-md bg-slate-900/5 dark:bg-white/10 px-1.5 py-px align-[1px] text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  {partida.categoria}
                </span>
              )}
              {open ? producto : productoCerrado}
            </span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {[partida.color && `Color ${partida.color}`, !open && resumenTallas]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
          <ChevronDownIcon
            className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:text-slate-600 dark:group-hover:text-slate-200 ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </button>
        {sinSku && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300"
            title="Sin SKU no se puede surtir: falta terminar de dar de alta el producto."
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
            Pendiente de SKU
          </span>
        )}
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
              aria-label={`Solicitar producción, ${partidaLabel} (próximamente)`}
              className="w-3.5 h-3.5 rounded border-slate-300 cursor-not-allowed"
            />
            Solicitar producción · Próximamente
          </label>
        )}
      </div>

      {open && (
      <div className="border-t border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-black/10 overflow-x-auto">
        <table className={`w-full text-xs ${conExistencia ? "min-w-[36rem]" : "min-w-[24rem]"}`} aria-label={`Tallas de ${partidaLabel}`}>
          <thead>
            <tr className="bg-slate-50/80 dark:bg-white/5 border-b border-slate-200/70 dark:border-white/10">
              <th className={`${TH} text-left`}>Talla</th>
              <th className={`${TH} text-left`}>SKU</th>
              <th className={`${TH} text-left`}>Servicios</th>
              <th className={`${TH} text-right`}>Solicitado</th>
              {conExistencia && (
                <>
                  <th className={`${TH} text-right`}>Disponible</th>
                  <th className={`${TH} text-right`}>Diferencia</th>
                  <th className={`${TH} text-left`}>Estado</th>
                </>
              )}
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
                    {renglon.sku?.trim() ? (
                      renglon.sku
                    ) : (
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        Pendiente de SKU
                      </span>
                    )}
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
                  {conExistencia && (
                  <>
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
                  </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
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
  // Abiertas de inicio solo las que piden atención; las demás quedan en una línea.
  const [abiertas, setAbiertas] = useState<Record<number, boolean>>({});
  const isOpen = (partida: ProgramarPartida) =>
    abiertas[partida.id] ?? partidaRequiereAtencion(partida);
  const toggle = (partida: ProgramarPartida) =>
    setAbiertas((prev) => ({ ...prev, [partida.id]: !isOpen(partida) }));
  const pendientesSku = partidas.filter(partidaSinSku);
  const conFaltante = partidas.filter((partida) => partida.faltan > 0);
  const muestras = partidas.filter((partida) => partida.esMuestra);
  /** Abre la primera partida del grupo y la lleva a la vista. */
  const irA = (grupo: ProgramarPartida[]) => {
    const primera = grupo[0];
    if (!primera) return;
    setAbiertas((prev) => ({ ...prev, [primera.id]: true }));
    requestAnimationFrame(() =>
      document
        .getElementById(partidaDomId(primera.id))
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };
  const todoAbierto = partidas.length > 0 && partidas.every(isOpen);
  const setTodas = (open: boolean) =>
    setAbiertas(Object.fromEntries(partidas.map((partida) => [partida.id, open])));
  // Verde solo si el pedido entero está cubierto: un 100 % de las tallas medidas
  // con alguna partida "Sin medir" no lo está.
  const coverageTone =
    resumen?.pedidoCubierto
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
              SIN_MEDIDA
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
              {SIN_MEDIDA}
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
          {/* Pendientes: qué falta para terminar de programar, de un vistazo.
              Cada chip abre y lleva a la primera partida de su grupo. */}
          <div className="flex flex-wrap items-center gap-2">
            {pendientesSku.length === 0 && conFaltante.length === 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                Sin pendientes
              </span>
            )}
            {pendientesSku.length > 0 && (
              <button
                type="button"
                onClick={() => irA(pendientesSku)}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-200/70 dark:hover:bg-amber-500/25"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                {pendientesSku.length}{" "}
                {plural(pendientesSku.length, "partida pendiente", "partidas pendientes")} de SKU
              </button>
            )}
            {conFaltante.length > 0 && (
              <button
                type="button"
                onClick={() => irA(conFaltante)}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-200/70 dark:hover:bg-rose-500/25"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" aria-hidden="true" />
                {conFaltante.length} con faltante
              </button>
            )}
            {muestras.length > 0 && (
              <button
                type="button"
                onClick={() => irA(muestras)}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-200/70 dark:hover:bg-violet-500/25"
              >
                {muestras.length} {plural(muestras.length, "muestra", "muestras")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setTodas(!todoAbierto)}
              className="ml-auto text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
            >
              {todoAbierto ? "Contraer todas" : "Expandir todas"}
            </button>
          </div>
          {partidas.map((partida, index) => (
            <PartidaCard
              key={partida.id}
              partida={partida}
              numero={index + 1}
              open={isOpen(partida)}
              onToggle={() => toggle(partida)}
            />
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
