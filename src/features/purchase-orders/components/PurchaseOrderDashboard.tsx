"use client";

import { useMemo, type ComponentType, type ReactNode, type SVGProps } from "react";
import Link from "next/link";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";
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
import { groupByCurrency, sumAmounts, sumByCurrency, visibleCurrencyEntries } from "@/src/utils/currencyTotals";
import { formatCurrencyTotalsInline, UNKNOWN_CURRENCY_TAG } from "@/src/components/CurrencyTotalsValue";
import {
  isPurchaseOrderAuthorizedOrComplete,
  isPurchaseOrderCancelled,
  isPurchaseOrderDraft,
  isPurchaseOrderPartiallyReceived,
  isPurchaseOrderPending,
} from "../constants/purchaseOrderStatus";

/** Moneda de la orden para agrupar sus importes; `null` (sin símbolo) si llegara vacía. */
const monedaDe = (order: PurchaseOrder): string | null => order.moneda_codigo || null;

/** Detalle de una OC (la ruta exige `R-COMPRAS-OC`, el mismo permiso que da este listado). */
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
function OrderRow({ order, children }: { order: PurchaseOrder; children: ReactNode }) {
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

// ─── Componente principal ─────────────────────────────────────────────────────

interface PurchaseOrderDashboardProps {
  orders: PurchaseOrder[];
}

export function PurchaseOrderDashboard({ orders }: PurchaseOrderDashboardProps) {
  // Agregaciones derivadas de los datos
  const stats = useMemo(() => {
    // Las canceladas (estatus 6) siguen llegando en el listado, pero ya no son
    // órdenes "activas": no cuentan en el total, en el valor ni en el Top 5.
    // `total` es además el denominador de las barras de progreso, así que las
    // proporciones también quedan sobre las activas.
    const activas = orders.filter((o) => !isPurchaseOrderCancelled(o.estatus));
    const total = activas.length;
    // `safeParseAmount` y no `Number()`: `total` puede venir AUSENTE de la
    // respuesta (filtro por rol), y `Number(undefined)` contaminaría la suma
    // entera con `NaN`. Un importe no visible cuenta como 0 en el agregado.
    //
    // Un total POR MONEDA (EC-601): el listado puede traer órdenes en MXN y en
    // USD, y sumarlas exigiría un tipo de cambio que el backend no expone aquí.
    const totalValue = sumByCurrency(activas, monedaDe, (o) => safeParseAmount(o.total));
    // Sin permiso de contabilidad el backend QUITA la clave `total` de todas
    // las filas (no la manda en 0): el valor no es cero sino no visible, así
    // que se muestra "—" en vez de "$0".
    const totalOculto = activas.length > 0 && activas.every((o) => o.total === undefined);

    const pendientes = orders.filter((o) => isPurchaseOrderPending(o.estatus)).length;
    const autorizadasOCompletadas = orders.filter((o) =>
      isPurchaseOrderAuthorizedOrComplete(o.estatus),
    ).length;
    const canceladas = orders.filter((o) => isPurchaseOrderCancelled(o.estatus)).length;
    const borradores = orders.filter((o) => isPurchaseOrderDraft(o.estatus)).length;

    // Órdenes en curso: autorizadas con recepciones PARCIALES, es decir, la
    // mercancía ya está entrando pero la orden todavía no cierra.
    //
    // Antes este bloque contaba `o.tracking`, un campo que nunca existió en el
    // backend: el KPI marcaba siempre 0 y el panel siempre salía vacío. El
    // estatus 4 es el dato real equivalente.
    const enCurso = orders.filter((o) => isPurchaseOrderPartiallyReceived(o.estatus));

    // Las 8 más próximas a entregar. Las que no tienen fecha estimada van al
    // fondo (no se pueden priorizar) en vez de encabezar el orden alfabético.
    const critical = [...enCurso]
      .sort((a, b) => {
        const etaA = a.fecha_entrega_estimada ?? "";
        const etaB = b.fecha_entrega_estimada ?? "";
        if (!etaA) return etaB ? 1 : 0;
        if (!etaB) return -1;
        return etaA.localeCompare(etaB);
      })
      .slice(0, 8);

    // Top 5 por valor total DENTRO de cada moneda (EC-601): un importe en USD
    // no se compara con uno en MXN. Mismo criterio que `totalValue` para el
    // ausente.
    // Las monedas cuyas órdenes suman cero se ocultan si otra tiene importe
    // (`visibleCurrencyEntries`); si todas dan cero —p. ej. el rol oculta
    // `total`— se conservan todas, con su "—" por fila.
    const rankings = groupByCurrency(activas, monedaDe).map(({ moneda, items }) => ({
      moneda,
      suma: sumAmounts(items.map((o) => safeParseAmount(o.total))),
      orders: [...items]
        .sort((a, b) => safeParseAmount(b.total) - safeParseAmount(a.total))
        .slice(0, 5),
    }));
    const { visibles: rankingsConImporte, showCodes: topPorMoneda } = visibleCurrencyEntries(
      rankings,
      (ranking) => ranking.suma,
    );
    const topByValue = rankingsConImporte.length > 0 ? rankingsConImporte : rankings;

    return {
      total,
      totalValue,
      totalOculto,
      pendientes,
      autorizadasOCompletadas,
      canceladas,
      borradores,
      enCurso: enCurso.length,
      critical,
      topByValue,
      // Varias monedas en las órdenes: cada ranking lleva su código, aunque
      // quede uno solo a la vista (`visibleCurrencyEntries`).
      topPorMoneda,
    };
  }, [orders]);

  const enAutorizacion = stats.borradores + stats.pendientes;
  const pctOf = (n: number) => (stats.total > 0 ? (n / stats.total) * 100 : 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── KPIs principales ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" role="list">
        <KpiTile
          label="Órdenes activas"
          icon={ComprasIcon}
          accentText="text-sky-500"
          accentSoftBg="bg-sky-50 dark:bg-sky-500/10"
          value={<span className={BIG_NUMBER_CLS}>{stats.total}</span>}
          detail={
            <span className="tabular-nums">
              {stats.totalOculto
                ? "—"
                : formatCurrencyTotalsInline(stats.totalValue, { maximumFractionDigits: 0 })}{" "}
              valor total
            </span>
          }
          progress={100}
        />
        <KpiTile
          label="En curso"
          icon={EmbarquesIcon}
          accentText="text-indigo-500"
          accentSoftBg="bg-indigo-50 dark:bg-indigo-500/10"
          value={<span className={BIG_NUMBER_CLS}>{stats.enCurso}</span>}
          detail="Con recepción parcial registrada"
          progress={pctOf(stats.enCurso)}
        />
        <KpiTile
          label="Por autorizar"
          icon={ClockIcon}
          accentText="text-amber-500"
          accentSoftBg="bg-amber-50 dark:bg-amber-500/10"
          value={<span className={BIG_NUMBER_CLS}>{enAutorizacion}</span>}
          detail="Borrador o pendiente de autorización"
          progress={pctOf(enAutorizacion)}
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
              <span className={BIG_NUMBER_CLS}>{stats.autorizadasOCompletadas}</span>
              <span className="text-lg sm:text-xl font-bold text-red-500 dark:text-red-400 tabular-nums">
                {stats.canceladas}
                <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide">
                  canceladas
                </span>
              </span>
            </div>
          }
          detail="Autorizadas o completadas"
          progress={pctOf(stats.autorizadasOCompletadas)}
        />
      </div>

      {/* ── Grid inferior ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        {/* Órdenes en curso (recepción parcial), por fecha de entrega estimada */}
        <Panel
          title="Órdenes en curso"
          subtitle="Con recepción parcial, por entrega estimada"
          aside={
            <span className="inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" aria-hidden="true" />
              {stats.critical.length} {plural(stats.critical.length, "activa", "activas")}
            </span>
          }
        >
          {stats.critical.length > 0 ? (
            stats.critical.map((order) => (
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
            ))
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
            stats.topPorMoneda
              ? "Órdenes activas de mayor importe, por moneda"
              : "Órdenes activas de mayor importe"
          }
        >
          {stats.topByValue.length > 0 ? (
            <div className={stats.topByValue.length > 1 ? "space-y-3" : undefined}>
              {stats.topByValue.map((group) => {
                // El máximo es el de SU moneda: las barras no comparan monedas
                // distintas. `> 0`: si el rol oculta `total`, todo vale 0.
                const maxValue = safeParseAmount(group.orders[0]?.total);
                return (
                  <div key={group.moneda ?? UNKNOWN_CURRENCY_TAG}>
                    {stats.topPorMoneda && (
                      <p className="px-3 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {group.moneda ?? UNKNOWN_CURRENCY_TAG}
                      </p>
                    )}
                    {group.orders.map((order, idx) => {
                      const pct = maxValue > 0 ? (safeParseAmount(order.total) / maxValue) * 100 : 0;
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
                              {/* En la moneda de LA ORDEN, y "—" si no es visible */}
                              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums shrink-0">
                                {formatMoneyValueOrDash(order.total, order.moneda_codigo, { maximumFractionDigits: 0 })}
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
              })}
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
