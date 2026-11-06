"use client";

import type { ComponentType, ReactNode, SVGProps } from "react";
import Link from "next/link";
import type {
  PurchaseOrderKpis,
  PurchaseOrderKpiTopOrder,
} from "../interfaces/purchase-order-kpis.interface";
import {
  ComprasIcon,
  ClockIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  EmbarquesIcon,
} from "@/src/components/Icons";
import { formatMoneyValueOrDash, safeParseAmount } from "@/src/utils/formatCurrency";
import { formatLocalDate } from "@/src/utils/formatDate";
import { plural } from "@/src/utils/plural";
import { sumAmounts, visibleCurrencyEntries } from "@/src/utils/currencyTotals";
import { formatCurrencyTotalsInline, UNKNOWN_CURRENCY_TAG } from "@/src/components/CurrencyTotalsValue";

/** Importe de los indicadores: número JSON (o texto, si cambia el encoder). */
const amountOf = (value: number | string | undefined) => safeParseAmount(String(value ?? 0));

/** Detalle de una OC (la ruta exige `R-COMPRAS-OC`, el mismo permiso que da este panel). */
const orderHref = (id: number) => `/procurement/purchase-orders/${id}`;

// ─── Tarjeta de indicador ────────────────────────────────────────────────────

interface KpiTileProps {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Clases de color del acento: `text-*` para ícono/barra y `bg-*` suave para la insignia. */
  accentText: string;
  accentSoftBg: string;
  value: ReactNode;
  detail: ReactNode;
  /** 0–100; sin él no se pinta barra. */
  progress?: number;
}

/**
 * Una sola definición para las cuatro tarjetas (antes eran cuatro copias del
 * mismo marcado). En móvil el padding y los tamaños bajan para que dos
 * tarjetas por fila quepan sin desbordarse.
 */
function KpiTile({ label, icon: Icon, accentText, accentSoftBg, value, detail, progress }: KpiTileProps) {
  return (
    <div
      role="listitem"
      className="group relative overflow-hidden rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-3.5 sm:p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
    >
      <div
        className={`absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-transparent via-current to-transparent opacity-50 group-hover:opacity-100 transition-opacity ${accentText}`}
      />
      <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          {label}
        </span>
        <span className={`grid place-items-center w-8 h-8 shrink-0 rounded-lg ${accentSoftBg} ${accentText}`}>
          <Icon className="w-4 h-4" aria-hidden="true" />
        </span>
      </div>
      <div className="mb-1.5">{value}</div>
      <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-snug mb-2">
        {detail}
      </div>
      {progress !== undefined && (
        <div className={`h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ${accentText}`}>
          <div className="h-full bg-current rounded-full" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

const BIG_NUMBER_CLS = "text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight tabular-nums";

// ─── Panel con lista ─────────────────────────────────────────────────────────

function Panel({
  title,
  subtitle,
  aside,
  children,
}: {
  title: string;
  subtitle: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 shadow-sm">
      <div className="flex items-start justify-between gap-3 px-4 sm:px-5 pt-4 pb-3 border-b border-slate-100 dark:border-white/5">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        {aside}
      </div>
      <div className="p-2">{children}</div>
    </section>
  );
}

/** Renglón que abre el detalle de la OC: toda la fila es el enlace, con ">" al final. */
function OrderRow({ order, children }: { order: { id: number }; children: ReactNode }) {
  return (
    <Link
      href={orderHref(order.id)}
      title="Ver detalle"
      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
    >
      {children}
      <ChevronRightIcon
        className="w-4 h-4 shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all"
        aria-hidden="true"
      />
    </Link>
  );
}

/** Mensaje de un bloque que el backend no puede dar (sin empresa, sin permiso). */
function Unavailable({ motivo }: { motivo: string }) {
  return (
    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6 px-3">{motivo}</p>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface PurchaseOrderDashboardProps {
  /** `GET /compras/ordenes/kpis/`: el backend calcula todo sobre las OC de la empresa. */
  kpis: PurchaseOrderKpis;
}

/**
 * Panel de Compras sobre `GET /compras/ordenes/kpis/` (EC-782): conteos por
 * grupo de estatus, valor de las activas por moneda, top 5 por moneda y las 8
 * OC en curso más próximas a entregar. Nada se calcula aquí sobre un listado:
 * antes se bajaba la lista completa de OC para sumarla en memoria.
 *
 * El valor es `gran_total` (antes `total`, sin IVA). Sin permiso de importes el
 * backend quita los montos y devuelve el top como `{ disponible: false }`: el
 * valor dice "—" y el panel del top explica por qué.
 */
export function PurchaseOrderDashboard({ kpis }: PurchaseOrderDashboardProps) {
  const grupos = kpis.ocs_por_grupo.disponible ? kpis.ocs_por_grupo : null;
  const valor = kpis.valor_ocs_activas.disponible ? kpis.valor_ocs_activas : null;
  const enCurso = kpis.ocs_en_curso_proxima_entrega;
  const top = kpis.top_ocs_por_moneda;

  // `activas` (todo menos canceladas) es el denominador de las barras.
  const total = grupos?.activas ?? 0;
  const count = (n: number | undefined) => (n === undefined ? "—" : n);
  const pctOf = (n: number | undefined) => (n !== undefined && total > 0 ? (n / total) * 100 : 0);

  // Sin permiso el backend QUITA `monto` (no lo manda en 0): no es cero sino no
  // visible, así que "—" en vez de "$0". Un total POR MONEDA (EC-601).
  const valorOculto = !valor || valor.por_moneda.some((fila) => fila.monto === undefined);
  const totalValue = (valor?.por_moneda ?? []).map((fila) => ({
    moneda: fila.moneda || null,
    total: amountOf(fila.monto),
  }));

  // Las monedas cuyas OC suman cero se ocultan si otra tiene importe
  // (`visibleCurrencyEntries`); si todas dan cero se conservan todas.
  const rankings = top.disponible
    ? top.monedas.map(({ moneda, ocs }) => ({
        moneda,
        suma: sumAmounts(ocs.map((oc) => amountOf(oc.gran_total))),
        orders: ocs,
      }))
    : [];
  const { visibles: rankingsConImporte, showCodes: topPorMoneda } = visibleCurrencyEntries(
    rankings,
    (ranking) => ranking.suma,
  );
  const topByValue = rankingsConImporte.length > 0 ? rankingsConImporte : rankings;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── KPIs principales ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" role="list">
        <KpiTile
          label="Órdenes activas"
          icon={ComprasIcon}
          accentText="text-sky-500"
          accentSoftBg="bg-sky-50 dark:bg-sky-500/10"
          value={<span className={BIG_NUMBER_CLS}>{count(grupos?.activas)}</span>}
          detail={
            <span className="tabular-nums">
              {valorOculto
                ? "—"
                : formatCurrencyTotalsInline(totalValue, { maximumFractionDigits: 0 })}{" "}
              valor total
            </span>
          }
          progress={grupos ? 100 : undefined}
        />
        <KpiTile
          label="En curso"
          icon={EmbarquesIcon}
          accentText="text-indigo-500"
          accentSoftBg="bg-indigo-50 dark:bg-indigo-500/10"
          value={<span className={BIG_NUMBER_CLS}>{count(grupos?.en_curso)}</span>}
          detail="Con recepción parcial registrada"
          progress={pctOf(grupos?.en_curso)}
        />
        <KpiTile
          label="Por autorizar"
          icon={ClockIcon}
          accentText="text-amber-500"
          accentSoftBg="bg-amber-50 dark:bg-amber-500/10"
          value={<span className={BIG_NUMBER_CLS}>{count(grupos?.por_autorizar)}</span>}
          detail="Borrador o pendiente de autorización"
          progress={pctOf(grupos?.por_autorizar)}
        />
        <KpiTile
          label="Cierre"
          icon={CheckCircleIcon}
          accentText="text-emerald-500"
          accentSoftBg="bg-emerald-50 dark:bg-emerald-500/10"
          value={
            // `flex-wrap`: en móvil, si las dos cifras no caben lado a lado,
            // la de canceladas baja en vez de salirse de la tarjeta.
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span className={BIG_NUMBER_CLS}>{count(grupos?.autorizadas_o_completadas)}</span>
              <span className="text-lg sm:text-xl font-bold text-red-500 dark:text-red-400 tabular-nums">
                {count(grupos?.canceladas)}
                <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide">
                  canceladas
                </span>
              </span>
            </div>
          }
          detail="Autorizadas o completadas"
          progress={pctOf(grupos?.autorizadas_o_completadas)}
        />
      </div>

      {/* ── Grid inferior ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        {/* Órdenes en curso (recepción parcial), por fecha de entrega estimada */}
        <Panel
          title="Órdenes en curso"
          subtitle="Con recepción parcial, por entrega estimada"
          aside={
            enCurso.disponible ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" aria-hidden="true" />
                {enCurso.drill_down_total} {plural(enCurso.drill_down_total, "activa", "activas")}
              </span>
            ) : undefined
          }
        >
          {!enCurso.disponible ? (
            <Unavailable motivo={enCurso.motivo} />
          ) : enCurso.drill_down.length > 0 ? (
            <>
              {enCurso.drill_down.map((order) => (
                <OrderRow key={order.id} order={order}>
                  <div className="flex-1 min-w-0">
                    {/* `folio` es nullable mientras el backend no lo asigna;
                        sin respaldo la fila quedaba sin identificador visible. */}
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-mono group-hover:text-sky-600 dark:group-hover:text-sky-400">
                      {order.folio ?? `#${order.id}`}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {order.proveedor_nombre ?? "—"}
                    </p>
                  </div>
                  {order.fecha_entrega_estimada && (
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ETA</p>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                        {formatLocalDate(order.fecha_entrega_estimada)}
                      </p>
                    </div>
                  )}
                </OrderRow>
              ))}
              {enCurso.drill_down_truncado && (
                <p className="px-3 pt-1 pb-2 text-xs text-slate-500 dark:text-slate-400">
                  Se muestran las {enCurso.drill_down.length} más próximas de{" "}
                  {enCurso.drill_down_total}.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">
              Sin órdenes con recepción parcial
            </p>
          )}
        </Panel>

        {/* Top 5 por valor: un ranking por moneda (EC-601) */}
        <Panel
          title="Top 5 por valor"
          subtitle={
            topPorMoneda
              ? "Órdenes activas de mayor importe, por moneda"
              : "Órdenes activas de mayor importe"
          }
        >
          {!top.disponible ? (
            <Unavailable
              motivo={
                kpis.puede_ver_importes
                  ? top.motivo
                  : "Tu rol no tiene acceso a los importes de las órdenes de compra."
              }
            />
          ) : topByValue.length > 0 ? (
            <div className={topByValue.length > 1 ? "space-y-3" : undefined}>
              {topByValue.map((group) => (
                <TopGroup
                  key={group.moneda ?? UNKNOWN_CURRENCY_TAG}
                  moneda={group.moneda}
                  orders={group.orders}
                  showCode={topPorMoneda}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">
              Sin órdenes activas
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}

/** Ranking de UNA moneda: las barras comparan solo contra el máximo de su moneda. */
function TopGroup({
  moneda,
  orders,
  showCode,
}: {
  moneda: string | null;
  orders: PurchaseOrderKpiTopOrder[];
  showCode: boolean;
}) {
  const maxValue = amountOf(orders[0]?.gran_total);
  return (
    <div>
      {showCode && (
        <p className="px-3 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {moneda ?? UNKNOWN_CURRENCY_TAG}
        </p>
      )}
      {orders.map((order, idx) => {
        const pct = maxValue > 0 ? (amountOf(order.gran_total) / maxValue) * 100 : 0;
        return (
          <OrderRow key={order.id} order={order}>
            <span className="grid place-items-center w-6 h-6 shrink-0 rounded-full bg-slate-100 dark:bg-white/10 text-[11px] font-bold text-slate-500 dark:text-slate-300 tabular-nums">
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                {/* El Top 5 SÍ puede incluir una orden todavía sin folio. */}
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-mono group-hover:text-sky-600 dark:group-hover:text-sky-400">
                  {order.folio ?? `#${order.id}`}
                </span>
                {/* En la moneda de LA ORDEN */}
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums shrink-0">
                  {formatMoneyValueOrDash(order.gran_total, order.moneda_codigo, {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
              <div className="mt-1 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden text-sky-500/70">
                <div className="h-full bg-current rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                {order.proveedor_nombre ?? "—"}
              </p>
            </div>
          </OrderRow>
        );
      })}
    </div>
  );
}
