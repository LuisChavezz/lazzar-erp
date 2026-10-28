"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/src/utils/permissions";
import { plural } from "@/src/utils/plural";
import { ModuleSectionsGrid } from "@/src/components/ModuleSectionsGrid";
import {
  ProduccionIcon,
  FactoryIcon,
  ScissorsIcon,
  SliceIcon,
  RulerIcon,
  CheckCircleIcon,
  ErrorIcon,
  ExclamationTriangleIcon,
  TrendingUpIcon,
  ChevronRightIcon,
} from "@/src/components/Icons";
import { useEmbroideryOrders } from "@/src/features/embroidery/hooks/useEmbroideryOrders";
import { useCorteMangaOrders } from "@/src/features/corte-manga/hooks/useCorteMangaOrders";
import { useReflectiveOrders } from "@/src/features/reflective-orders/hooks/useReflectiveOrders";
import type { EmbroideryOrder } from "@/src/features/embroidery/interfaces/embroidery.interface";
import { useProductionOrders } from "@/src/features/production-orders/hooks/useProductionOrders";
import type { ProductionOrderListItem } from "@/src/features/production-orders/interfaces/production-order.interface";
import { productionOrderStatusEntry } from "@/src/features/production-orders/constants/productionOrderStatus";
import {
  getEmbroideryOrderMetrics,
  getProductionOrderMetrics,
  type EmbroideryOrderMetrics,
  type ProductionOrderMetrics,
} from "../utils/manufacturingDashboardMetrics";

// ── Sub-componentes reutilizables ─────────────────────────────────────────────

/** Tarjeta KPI hero — mismo patrón que PurchaseOrderDashboard */
function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconText,
  accentColor,
  progress,
  badge,
  badgeCls,
  href,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  iconBg: string;
  iconText: string;
  accentColor: string;
  progress?: number;
  badge?: string;
  badgeCls?: string;
  /** Lista a la que lleva la tarjeta; toda la tarjeta es el enlace. */
  href?: string;
}) {
  const pct = typeof progress === "number" ? Math.max(0, Math.min(100, progress)) : 100;
  const Wrapper = href ? Link : "div";

  // Diseño compacto en una fila: insignia del ícono a la izquierda y, a su
  // lado, la cifra grande con su etiqueta; el detalle y el porcentaje abajo.
  // Antes la etiqueta y el ícono iban en una fila propia y el valor en otra,
  // lo que dejaba la tarjeta alta y con mucho aire vacío.
  return (
    <Wrapper
      href={href as string}
      className="group relative block overflow-hidden rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 px-4 py-3.5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300"
    >
      {/* Acento del color del indicador: siempre visible, más intenso al pasar el cursor */}
      <div
        className={`absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-transparent via-current to-transparent opacity-50 group-hover:opacity-100 transition-opacity ${accentColor}`}
      />
      <div className="flex items-center gap-3">
        <div className={`grid place-items-center w-11 h-11 shrink-0 rounded-xl ${iconBg} ${iconText}`}>
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold leading-tight text-slate-900 dark:text-white tracking-tight tabular-nums">
              {value}
            </h3>
            {badge && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badgeCls}`}>
                {badge}
              </span>
            )}
          </div>
        </div>
        {href && (
          <ChevronRightIcon
            className="w-4 h-4 shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all"
            aria-hidden="true"
          />
        )}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className={`h-1 flex-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ${accentColor}`}>
          <div className="h-full bg-current rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <span className="shrink-0 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
          {sub ? `${sub} · ` : ""}
          {Math.round(pct)}%
        </span>
      </div>
    </Wrapper>
  );
}

/** Tarjeta de sub-módulo con enlace y mini-estadísticas */
function ModuleCard({
  href,
  icon: Icon,
  iconBg,
  iconText,
  title,
  total,
  activas,
  completas,
  alertas,
  isUnavailable = false,
}: {
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  iconBg: string;
  iconText: string;
  title: string;
  total: number;
  activas: number;
  completas: number;
  alertas: number;
  /**
   * El módulo no pudo entregar sus cifras (cargando, o error de carga
   * inicial). Pinta guiones en vez de ceros: un `0` aquí se lee como "no hay
   * órdenes", que es una afirmación distinta —y falsa— frente a "no se pudo
   * saber". Opcional y `false` por defecto, así que las tarjetas que siguen en
   * maqueta no cambian.
   */
  isUnavailable?: boolean;
}) {
  const pctCompletas = total > 0 ? Math.round((completas / total) * 100) : 0;
  const fmt = (value: number) => (isUnavailable ? "—" : String(value));

  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-3 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-4 shadow-sm hover:shadow-lg hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300"
    >
      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${iconBg} ${iconText} shadow-[0_0_12px_rgba(15,23,42,0.06)]`}>
          <Icon className="w-4 h-4" aria-hidden="true" />
        </div>
        <ChevronRightIcon
          className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all duration-200"
        />
      </div>

      {/* Título + total */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight mb-0.5">
          {title}
        </p>
        <span className={`text-2xl font-black tabular-nums tracking-tight font-mono ${iconText}`}>
          {fmt(total)}
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">órdenes</span>
      </div>

      {/* Mini-estadísticas */}
      <div className="grid grid-cols-3 gap-1 text-center">
        <div className="rounded-lg bg-sky-50 dark:bg-sky-500/10 px-1 py-1.5">
          <p className="text-sm font-bold tabular-nums text-sky-600 dark:text-sky-400 leading-none">{fmt(activas)}</p>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 font-semibold uppercase tracking-wide">Activas</p>
        </div>
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-1 py-1.5">
          <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400 leading-none">{fmt(completas)}</p>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 font-semibold uppercase tracking-wide">Completadas</p>
        </div>
        <div className={`rounded-lg px-1 py-1.5 ${!isUnavailable && alertas > 0 ? "bg-red-50 dark:bg-red-500/10" : "bg-slate-50 dark:bg-slate-500/10"}`}>
          <p className={`text-sm font-bold tabular-nums leading-none ${!isUnavailable && alertas > 0 ? "text-red-600 dark:text-red-400" : "text-slate-400 dark:text-slate-500"}`}>
            {fmt(alertas)}
          </p>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 font-semibold uppercase tracking-wide">Alertas</p>
        </div>
      </div>

      {/* Barra de progreso hacia completadas */}
      <div>
        <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-700"
            style={{ width: isUnavailable ? "0%" : `${pctCompletas}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-semibold">
          {isUnavailable ? "Sin datos disponibles" : `${pctCompletas}% completadas`}
        </p>
      </div>
    </Link>
  );
}

/** Fila de una OP (panel de alertas y "Últimas órdenes"): folio + estatus real. */
function OrderRow({ order }: { order: ProductionOrderListItem }) {
  const status = productionOrderStatusEntry(order.estatus_op, order.estatus_op_display);

  return (
    <Link
      href={`/manufacturing/production-orders/${order.op_id}`}
      title="Ver detalle"
      className="group flex items-center gap-3 -mx-2 px-2 py-2.5 rounded-lg border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${status.dot}`} aria-hidden="true" />
      <p className="flex-1 min-w-0 text-xs font-semibold text-slate-700 dark:text-slate-200 font-mono truncate group-hover:text-sky-600 dark:group-hover:text-sky-400">
        {order.folio_op}
      </p>
      <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${status.cls}`}>
        {status.label}
      </span>
      <ChevronRightIcon
        className="w-3.5 h-3.5 shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all"
        aria-hidden="true"
      />
    </Link>
  );
}

/** Barra de distribución horizontal — para el gráfico de estatus */
function DistBar({
  label,
  count,
  total,
  dotCls,
  labelCls,
}: {
  label: string;
  count: number;
  total: number;
  dotCls: string;
  /** Clases del badge del estatus (`PRODUCTION_ORDER_STATUS_CONFIG`). */
  labelCls: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 w-40 shrink-0">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotCls}`} aria-hidden="true" />
        <span className={`text-[11px] font-semibold truncate rounded px-1.5 py-0.5 ${labelCls}`}>{label}</span>
      </div>
      <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
        <div
          className={`h-full rounded-full transition-all duration-700 ${dotCls} opacity-80`}
          style={{ width: `${pct}%` }}
        />
        {count > 0 && (
          <span className="absolute inset-y-0 left-2 flex items-center text-[9px] font-bold text-white/90 leading-none tabular-nums">
            {count}
          </span>
        )}
      </div>
      <span className="w-8 text-right text-[11px] font-bold tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
        {count}
      </span>
    </div>
  );
}

/** Fila de la distribución por prioridad. */
function PriorityRow({
  label,
  count,
  total,
  dotCls,
  valueCls,
  isUnavailable,
}: {
  label: string;
  count: number;
  total: number;
  dotCls: string;
  valueCls: string;
  isUnavailable: boolean;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotCls}`} aria-hidden="true" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold tabular-nums font-mono ${valueCls}`}>
            {isUnavailable ? "—" : count}
          </span>
          <span className="text-[10px] font-bold text-slate-400">
            {isUnavailable ? "" : `${Math.round(pct)}%`}
          </span>
        </div>
      </div>
      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${dotCls}`}
          style={{ width: `${isUnavailable ? 0 : pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Datos ─────────────────────────────────────────────────────────────────────

/**
 * Listado + si sus cifras se pueden mostrar. `isUnavailable` pinta guiones en
 * vez de ceros: un `0` se leería como "no hay órdenes" cuando lo cierto es "no
 * se pudo saber". Es `!hasLoaded` (`data === undefined`), que equivale a
 * `isPending || isInitialLoadError`: cubre la carga, el error de carga inicial
 * y también una consulta PAUSADA (p. ej. sin conexión), donde `isLoading` es
 * `false` aunque no haya datos. Un refetch fallido CON datos en caché no entra
 * aquí: se conservan los últimos datos buenos.
 */
interface ListState<T> {
  data: T[];
  isUnavailable: boolean;
}

// Cada listado se consulta SOLO si el usuario tiene el permiso de su pantalla
// (`R-PRODUCCION-OP` / `-OB`): estos componentes se montan únicamente en ese
// caso, así que sin permiso no sale la petición. Es el gating que permiten
// `useProductionOrders`/`useEmbroideryOrders` sin opción `enabled`. Comparten
// la caché (`["production-orders"]`, `["embroidery-orders"]`) con sus
// pantallas: no hay fetch extra al venir de ellas.

function WithProductionOrders({
  children,
}: {
  children: (state: ListState<ProductionOrderListItem>) => ReactNode;
}) {
  const { data, hasLoaded } = useProductionOrders();
  return children({ data: data ?? [], isUnavailable: !hasLoaded });
}

function WithEmbroideryOrders({
  children,
}: {
  children: (state: ListState<EmbroideryOrder>) => ReactNode;
}) {
  // `notifyOnRefetchError: false`: el toast de "no se pudo actualizar" de
  // `useEmbroideryOrders` está redactado para la pantalla de bordado; aquí
  // llegaría sin decir a qué bloque se refiere.
  const { orders, hasLoaded } = useEmbroideryOrders({
    notifyOnRefetchError: false,
  });
  return children({ data: orders, isUnavailable: !hasLoaded });
}

/**
 * Cifras de un módulo cuyos estatus siguen el esquema 1-7 compartido por Corte
 * de Manga y Reflejante: 1-4 activas, 5 completada, 6 detenida (alerta) y 7
 * cancelada, que no cuenta en el total — mismo criterio que OP y OB.
 */
const statusModuleCounts = (estatuses: number[]) => {
  const vigentes = estatuses.filter((estatus) => estatus !== 7);
  return {
    total: vigentes.length,
    activas: vigentes.filter((estatus) => estatus >= 1 && estatus <= 4).length,
    completas: vigentes.filter((estatus) => estatus === 5).length,
    alertas: vigentes.filter((estatus) => estatus === 6).length,
  };
};

/**
 * Tarjeta de Órdenes de Corte de Manga. Consulta su propio listado y solo se
 * monta con `R-PRODUCCION-CM`. Hoy el backend siempre manda estatus 1
 * (Pendiente), así que lo normal es ver todas como activas.
 */
function CorteMangaModuleCard() {
  const { orders, hasLoaded } = useCorteMangaOrders();
  return (
    <ModuleCard
      href="/manufacturing/corte-manga"
      icon={SliceIcon}
      iconBg="bg-amber-50 dark:bg-amber-500/10"
      iconText="text-amber-500"
      title="Órdenes de Corte de Manga"
      {...statusModuleCounts(orders.map((o) => o.estatus_corte))}
      isUnavailable={!hasLoaded}
    />
  );
}

/** Tarjeta de Órdenes de Reflejante, con `R-PRODUCCION-OR`. Mismo esquema de estatus. */
function ReflectiveModuleCard() {
  const { orders, hasLoaded } = useReflectiveOrders();
  return (
    <ModuleCard
      href="/manufacturing/reflective-orders"
      icon={RulerIcon}
      iconBg="bg-emerald-50 dark:bg-emerald-500/10"
      iconText="text-emerald-500"
      title="Órdenes de Reflejante"
      {...statusModuleCounts(orders.map((o) => o.estatus_reflejante))}
      isUnavailable={!hasLoaded}
    />
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

/**
 * Dashboard de Manufactura con datos reales de OP y OB. Cada bloque depende del
 * permiso de su pantalla: sin `R-PRODUCCION-OP` no hay ningún bloque de OP (ni
 * se consulta su listado) y las OPs no suman a los totales; lo mismo con
 * `R-PRODUCCION-OB` para bordado. Sin ninguno de los dos se muestra el índice
 * del módulo por sub-grupos (`ModuleSectionsGrid`).
 */
export function ManufacturingDashboard() {
  const { data: session } = useSession();
  const canViewProductionOrders = hasPermission("R-PRODUCCION-OP", session?.user);
  const canViewEmbroideryOrders = hasPermission("R-PRODUCCION-OB", session?.user);

  if (canViewProductionOrders && canViewEmbroideryOrders) {
    return (
      <WithProductionOrders>
        {(op) => (
          <WithEmbroideryOrders>{(ob) => <DashboardContent op={op} ob={ob} />}</WithEmbroideryOrders>
        )}
      </WithProductionOrders>
    );
  }
  if (canViewProductionOrders) {
    return <WithProductionOrders>{(op) => <DashboardContent op={op} />}</WithProductionOrders>;
  }
  if (canViewEmbroideryOrders) {
    return <WithEmbroideryOrders>{(ob) => <DashboardContent ob={ob} />}</WithEmbroideryOrders>;
  }
  // Sin ningún bloque visible, en vez de una página vacía: el índice del módulo
  // por sub-grupos, igual que el landing de Finanzas y Capital Humano.
  return <ModuleSectionsGrid moduleKey="manufacturing" />;
}

/**
 * Cuerpo del dashboard. `op`/`ob` ausentes = el usuario no tiene ese permiso:
 * sus bloques no se pintan y no suman a los totales.
 */
function DashboardContent({
  op,
  ob,
}: {
  op?: ListState<ProductionOrderListItem>;
  ob?: ListState<EmbroideryOrder>;
}) {
  const { data: session } = useSession();
  const canViewCorteManga = hasPermission("R-PRODUCCION-CM", session?.user);
  const canViewReflective = hasPermission("R-PRODUCCION-OR", session?.user);
  const opMetrics: ProductionOrderMetrics | null = op ? getProductionOrderMetrics(op.data) : null;
  const obMetrics: EmbroideryOrderMetrics | null = ob ? getEmbroideryOrderMetrics(ob.data) : null;
  const opUnavailable = op?.isUnavailable ?? false;
  const obUnavailable = ob?.isUnavailable ?? false;

  // Totales consolidados: solo los bloques visibles, sin canceladas (OP 7,
  // OB 8). Si alguna fuente incluida no se pudo cargar, el total no se conoce.
  const totalsUnavailable = opUnavailable || obUnavailable;
  const totalCounted = (opMetrics?.counted ?? 0) + (obMetrics?.counted ?? 0);
  const totalActive = (opMetrics?.active ?? 0) + (obMetrics?.active ?? 0);
  const totalAlerts = (opMetrics?.stopped.length ?? 0) + (obMetrics?.alerts ?? 0);

  const fmt = (value: number, isUnavailable: boolean) => (isUnavailable ? "—" : value);
  const pctOf = (count: number, base: number) => (base > 0 ? (count / base) * 100 : 0);

  const totals = (
    <div className="grid grid-cols-3 gap-3 text-center">
      {[
        { label: "Total OP + OB", value: totalCounted, cls: "text-slate-700 dark:text-slate-200" },
        { label: "Activas", value: totalActive, cls: "text-sky-600 dark:text-sky-400" },
        {
          label: "Alertas",
          value: totalAlerts,
          cls: !totalsUnavailable && totalAlerts > 0 ? "text-red-600 dark:text-red-400" : "text-slate-400",
        },
      ].map(({ label, value, cls }) => (
        <div key={label} className="rounded-lg bg-slate-50 dark:bg-white/5 py-2 px-1">
          <p className={`text-lg font-black tabular-nums font-mono ${cls}`}>{fmt(value, totalsUnavailable)}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wide mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ── KPIs principales (OP) ────────────────────────────────────────── */}
      {opMetrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="OPs Activas"
            href="/manufacturing/production-orders"
            value={fmt(opMetrics.active, opUnavailable)}
            sub="Órdenes en curso"
            icon={ProduccionIcon}
            iconBg="bg-sky-50 dark:bg-sky-500/10"
            iconText="text-sky-500"
            accentColor="text-sky-500"
            progress={opUnavailable ? 0 : pctOf(opMetrics.active, opMetrics.counted)}
            badge="Activas"
            badgeCls="text-sky-500 bg-sky-50 dark:bg-sky-500/10"
          />
          <KpiCard
            label="En Producción"
            href="/manufacturing/production-orders"
            value={fmt(opMetrics.inProduction, opUnavailable)}
            sub="Órdenes en piso"
            icon={FactoryIcon}
            iconBg="bg-violet-50 dark:bg-violet-500/10"
            iconText="text-violet-500"
            accentColor="text-violet-500"
            progress={opUnavailable ? 0 : pctOf(opMetrics.inProduction, opMetrics.counted)}
          />
          <KpiCard
            label="Alertas"
            href="/manufacturing/production-orders"
            value={fmt(opMetrics.stopped.length, opUnavailable)}
            sub="detenidas"
            icon={ExclamationTriangleIcon}
            iconBg={!opUnavailable && opMetrics.stopped.length > 0 ? "bg-red-50 dark:bg-red-500/10" : "bg-slate-50 dark:bg-slate-500/10"}
            iconText={!opUnavailable && opMetrics.stopped.length > 0 ? "text-red-500" : "text-slate-400"}
            accentColor={!opUnavailable && opMetrics.stopped.length > 0 ? "text-red-500" : "text-slate-400"}
            progress={opUnavailable ? 0 : pctOf(opMetrics.stopped.length, opMetrics.counted)}
          />
          <KpiCard
            label="Completadas"
            href="/manufacturing/production-orders"
            value={fmt(opMetrics.completed, opUnavailable)}
            icon={CheckCircleIcon}
            iconBg="bg-emerald-50 dark:bg-emerald-500/10"
            iconText="text-emerald-500"
            accentColor="text-emerald-500"
            progress={opUnavailable ? 0 : pctOf(opMetrics.completed, opMetrics.counted)}
          />
        </div>
      )}

      {/* ── Grid central: módulos (2/3) + panel de OPs (1/3) ─────────────── */}
      {/* Sin OP no hay panel derecho: los módulos ocupan todo el ancho. */}
      <div className={`grid grid-cols-1 gap-6 items-start ${opMetrics ? "xl:grid-cols-3" : ""}`}>

        {/* Módulos de producción */}
        <div className={`space-y-4 ${opMetrics ? "xl:col-span-2" : ""}`}>
          <div
            // Tres tarjetas, en una fila; dos o cuatro, en pares (2x2).
            className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${
              [opMetrics, obMetrics, canViewCorteManga, canViewReflective].filter(Boolean).length === 3
                ? "lg:grid-cols-3"
                : ""
            }`}
          >
            {opMetrics && (
              <ModuleCard
                href="/manufacturing/production-orders"
                icon={ProduccionIcon}
                iconBg="bg-sky-50 dark:bg-sky-500/10"
                iconText="text-sky-500"
                title="Órdenes de Producción"
                total={opMetrics.counted}
                activas={opMetrics.active}
                completas={opMetrics.completed}
                alertas={opMetrics.stopped.length}
                isUnavailable={opUnavailable}
              />
            )}
            {obMetrics && (
              <ModuleCard
                href="/manufacturing/embroidery"
                icon={ScissorsIcon}
                iconBg="bg-fuchsia-50 dark:bg-fuchsia-500/10"
                iconText="text-fuchsia-500"
                title="Órdenes de Bordado"
                total={obMetrics.counted}
                activas={obMetrics.active}
                completas={obMetrics.completed}
                alertas={obMetrics.alerts}
                isUnavailable={obUnavailable}
              />
            )}
            {canViewCorteManga && <CorteMangaModuleCard />}
            {canViewReflective && <ReflectiveModuleCard />}
          </div>
          {/* Estatus y prioridad bajo los módulos (antes en una fila aparte):
              así la columna ancha no deja un hueco junto al panel derecho. */}
          {opMetrics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {/* Distribución por estatus */}
            <div className="rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-sm font-bold text-slate-800 dark:text-white">Distribución por estatus</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Órdenes de Producción — {fmt(opMetrics.all, opUnavailable)}{" "}
                  {plural(opUnavailable ? 0 : opMetrics.all, "total", "totales")}
                </p>
              </div>
              <div className="space-y-2.5">
                {!opUnavailable &&
                  opMetrics.byStatus.map((item) => {
                    const status = productionOrderStatusEntry(item.estatus, item.display);
                    return (
                      <DistBar
                        key={item.estatus}
                        label={status.label}
                        count={item.count}
                        total={opMetrics.all}
                        dotCls={status.dot}
                        labelCls={status.cls}
                      />
                    );
                  })}
              </div>
            </div>
  
            {/* Distribución por prioridad + totales consolidados */}
            <div className="rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-sm font-bold text-slate-800 dark:text-white">Prioridad de órdenes</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Clasificación de Órdenes de Producción por urgencia</p>
              </div>
              <div className="space-y-4">
                <PriorityRow
                  label="Alta prioridad"
                  count={opMetrics.byPriority.high}
                  total={opMetrics.all}
                  dotCls="bg-red-500"
                  valueCls="text-red-600 dark:text-red-400"
                  isUnavailable={opUnavailable}
                />
                <PriorityRow
                  label="Media prioridad"
                  count={opMetrics.byPriority.medium}
                  total={opMetrics.all}
                  dotCls="bg-amber-500"
                  valueCls="text-amber-600 dark:text-amber-400"
                  isUnavailable={opUnavailable}
                />
                <PriorityRow
                  label="Baja prioridad"
                  count={opMetrics.byPriority.low}
                  total={opMetrics.all}
                  dotCls="bg-slate-400"
                  valueCls="text-slate-500 dark:text-slate-400"
                  isUnavailable={opUnavailable}
                />
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5">{totals}</div>
            </div>
              </div>
          )}
          {/* Sin OP no existe la tarjeta de prioridad que los aloja: los
              totales van aquí, bajo las tarjetas de módulo. */}
          {!opMetrics && (
            <div className="rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-5 shadow-sm">
              {totals}
            </div>
          )}
        </div>

        {/* Panel derecho (1/3): alertas + recientes (OP) */}
        {opMetrics && (
          <div className="space-y-4">

            {/* Sección de alertas */}
            {!opUnavailable && opMetrics.stopped.length > 0 && (
              <div className="rounded-xl bg-white dark:bg-black border border-red-200 dark:border-red-500/20 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <ErrorIcon className="w-4 h-4 text-red-500 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">Órdenes en alerta</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Órdenes detenidas</p>
                  </div>
                </div>
                <div>
                  {opMetrics.stopped.map((o) => (
                    <OrderRow key={o.op_id} order={o} />
                  ))}
                </div>
                <Link
                  href="/manufacturing/production-orders"
                  className="mt-3 flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                >
                  Ver todas
                  <ChevronRightIcon className="w-3 h-3" />
                </Link>
              </div>
            )}

            {/* Últimas órdenes recientes */}
            <div className="rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Últimas órdenes</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Más recientes por fecha de inicio</p>
                </div>
                <TrendingUpIcon className="w-4 h-4 text-slate-300 dark:text-slate-600" />
              </div>
              {opUnavailable ? (
                <p className="py-2.5 text-xs text-slate-400">—</p>
              ) : opMetrics.recent.length === 0 ? (
                <p className="py-2.5 text-xs text-slate-400">Sin órdenes</p>
              ) : (
                opMetrics.recent.map((o) => <OrderRow key={o.op_id} order={o} />)
              )}
              <Link
                href="/manufacturing/production-orders"
                className="mt-3 flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
              >
                Ver todas las OPs
                <ChevronRightIcon className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
