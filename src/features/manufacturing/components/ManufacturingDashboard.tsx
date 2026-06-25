"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ProduccionIcon,
  FactoryIcon,
  ScissorsIcon,
  LayersIcon,
  CheckCircleIcon,
  ClockIcon,
  ErrorIcon,
  ExclamationTriangleIcon,
  TrendingUpIcon,
  ComprasIcon,
  ChevronRightIcon,
} from "@/src/components/Icons";
import { MOCK_EMBROIDERY_ORDERS } from "@/src/features/embroidery/mocks/embroidery-orders.mock";
import { MOCK_CEDICOR_PRODUCTION_ORDERS } from "@/src/features/cedicor/mocks/cedicor-production-order.mock";
import { MOCK_CEDICOR_NEW_DEVELOPMENT } from "@/src/features/cedicor/mocks/cedicor-new-development.mock";
import {
  PRODUCTION_ORDER_STATUS_LABELS,
  type ProductionOrder,
  type ProductionOrderStatus,
} from "@/src/features/production-orders/interfaces/production-order.interface";

// ── Tipos de estatus de cada sub-módulo ──────────────────────────────────────

type ProdStatus = ProductionOrderStatus;
type EmbrStatus = (typeof MOCK_EMBROIDERY_ORDERS)[number]["estatus_hoja"];
type CedicorProdStatus = (typeof MOCK_CEDICOR_PRODUCTION_ORDERS)[number]["estatus"];
type CedicorDevStatus = (typeof MOCK_CEDICOR_NEW_DEVELOPMENT)[number]["estatus"];

// ── Helpers visuales ─────────────────────────────────────────────────────────

/** Retorna las clases CSS de color para cada estatus de las OPs principales */
function prodStatusCls(estatus: ProdStatus): { text: string; bg: string; dot: string } {
  const map: Partial<Record<ProdStatus, { text: string; bg: string; dot: string }>> = {
    creada:                 { text: "text-slate-600 dark:text-slate-400",  bg: "bg-slate-50 dark:bg-slate-500/10",   dot: "bg-slate-400" },
    verificando_materiales: { text: "text-amber-700 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-amber-500/10",   dot: "bg-amber-500" },
    en_fabricacion:         { text: "text-sky-700 dark:text-sky-400",      bg: "bg-sky-50 dark:bg-sky-500/10",       dot: "bg-sky-500" },
    registrando_avance:     { text: "text-violet-700 dark:text-violet-400",bg: "bg-violet-50 dark:bg-violet-500/10", dot: "bg-violet-500" },
    cierre_solicitado:      { text: "text-teal-700 dark:text-teal-400",    bg: "bg-teal-50 dark:bg-teal-500/10",     dot: "bg-teal-500" },
    cerrada:                { text: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", dot: "bg-emerald-500" },
    comprando_materiales:   { text: "text-orange-700 dark:text-orange-400",bg: "bg-orange-50 dark:bg-orange-500/10", dot: "bg-orange-500" },
    material_faltante:      { text: "text-red-700 dark:text-red-400",      bg: "bg-red-50 dark:bg-red-500/15",       dot: "bg-red-500" },
    cancelada:              { text: "text-zinc-500 dark:text-zinc-400",    bg: "bg-zinc-100 dark:bg-zinc-500/10",    dot: "bg-zinc-400" },
  };
  return map[estatus] ?? { text: "text-slate-500", bg: "bg-slate-100", dot: "bg-slate-400" };
}

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
}) {
  const pct = typeof progress === "number" ? Math.max(0, Math.min(100, progress)) : 100;

  return (
    <div className="group relative rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-5 shadow-sm hover:shadow-lg transition-all duration-300">
      {/* Línea de acento superior */}
      <div
        className={`absolute inset-x-0 top-0 h-0.5 rounded-t-xl bg-linear-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-100 transition-opacity ${accentColor}`}
      />
      {/* Encabezado: label + ícono */}
      <div className="flex justify-between items-start mb-4">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
          {label}
        </span>
        <div className={`p-2 rounded-lg ${iconBg} ${iconText} shadow-[0_0_15px_rgba(15,23,42,0.08)]`}>
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
      </div>
      {/* Valor + badge */}
      <div className="flex items-baseline gap-2 mb-2">
        <h3 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight font-mono">
          {value}
        </h3>
        {badge && (
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${badgeCls}`}>
            {badge}
          </span>
        )}
      </div>
      {sub && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{sub}</p>
      )}
      {/* Barra de progreso */}
      <div className={`h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ${accentColor}`}>
        <div className="h-full bg-current rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
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
}) {
  const pctCompletas = total > 0 ? Math.round((completas / total) * 100) : 0;

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
          {total}
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">órdenes</span>
      </div>

      {/* Mini-estadísticas */}
      <div className="grid grid-cols-3 gap-1 text-center">
        <div className="rounded-lg bg-sky-50 dark:bg-sky-500/10 px-1 py-1.5">
          <p className="text-sm font-bold tabular-nums text-sky-600 dark:text-sky-400 leading-none">{activas}</p>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 font-semibold uppercase tracking-wide">Activas</p>
        </div>
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-1 py-1.5">
          <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400 leading-none">{completas}</p>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 font-semibold uppercase tracking-wide">Completadas</p>
        </div>
        <div className={`rounded-lg px-1 py-1.5 ${alertas > 0 ? "bg-red-50 dark:bg-red-500/10" : "bg-slate-50 dark:bg-slate-500/10"}`}>
          <p className={`text-sm font-bold tabular-nums leading-none ${alertas > 0 ? "text-red-600 dark:text-red-400" : "text-slate-400 dark:text-slate-500"}`}>
            {alertas}
          </p>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 font-semibold uppercase tracking-wide">Alertas</p>
        </div>
      </div>

      {/* Barra de progreso hacia completadas */}
      <div>
        <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${pctCompletas}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-semibold">
          {pctCompletas}% completadas
        </p>
      </div>
    </Link>
  );
}

/** Fila de orden en alerta (panel derecho) */
function AlertRow({
  folio,
  nombre,
  estatus,
}: {
  folio: string;
  nombre: string;
  estatus: ProdStatus;
}) {
  const cls = prodStatusCls(estatus);

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-white/5 last:border-0">
      <span className={`w-2 h-2 rounded-full shrink-0 ${cls.dot}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 font-mono">{folio}</p>
        <p className="text-[11px] text-slate-400 truncate">{nombre}</p>
      </div>
      <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${cls.bg} ${cls.text}`}>
        {PRODUCTION_ORDER_STATUS_LABELS[estatus]}
      </span>
    </div>
  );
}

/** Barra de distribución horizontal — para el gráfico de estatus */
function DistBar({
  label,
  count,
  total,
  dotCls,
  textCls,
}: {
  label: string;
  count: number;
  total: number;
  dotCls: string;
  textCls: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 w-40 shrink-0">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotCls}`} aria-hidden="true" />
        <span className={`text-[11px] font-semibold truncate ${textCls}`}>{label}</span>
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

// ── Componente principal ──────────────────────────────────────────────────────

export function ManufacturingDashboard() {
  const stats = useMemo(() => {
    const hoy = new Date();

    // ── Órdenes de Producción (módulo principal) ─────────────────────────
    const prod: ProductionOrder[] = [];
    const prodActivas   = prod.filter((o) => !["cerrada", "cancelada"].includes(o.estatus));
    const prodFabricando = prod.filter((o) => o.estatus === "en_fabricacion");
    const prodAlertas   = prod.filter((o) => ["material_faltante", "comprando_materiales"].includes(o.estatus));
    const prodCompletas = prod.filter((o) => o.estatus === "cerrada");
    const prodVencidas  = prodActivas.filter((o) => {
      if (!o.fecha_estimada_entrega) return false;
      return new Date(o.fecha_estimada_entrega) < hoy;
    });

    // Distribución por estatus (para el gráfico)
    const statusDist: Array<{ estatus: ProdStatus; count: number }> = [
      "creada",
      "verificando_materiales",
      "en_fabricacion",
      "registrando_avance",
      "cierre_solicitado",
      "cerrada",
      "comprando_materiales",
      "material_faltante",
      "cancelada",
    ].map((e) => ({
      estatus: e as ProdStatus,
      count: prod.filter((o) => o.estatus === e).length,
    })).filter((e) => e.count > 0);

    // Distribución por prioridad
    const alta  = prod.filter((o) => o.prioridad === "alta").length;
    const media = prod.filter((o) => o.prioridad === "media").length;
    const baja  = prod.filter((o) => o.prioridad === "baja").length;

    // Últimas 5 OPs recientes (para el panel derecho, cuando no hay alertas)
    const recientes = [...prod]
      .sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())
      .slice(0, 5);

    // ── Bordado ──────────────────────────────────────────────────────────
    const emb = MOCK_EMBROIDERY_ORDERS;
    const embActivas   = emb.filter((o) => ["sin_liberar", "liberada", "en_proceso"].includes(o.estatus_hoja)).length;
    const embCompletas = emb.filter((o) => o.estatus_hoja === "terminada").length;
    const embAlertas   = 0; // sin estatus de alerta definido en bordado

    // ── Cedicor — Producción ─────────────────────────────────────────────
    const cedProd = MOCK_CEDICOR_PRODUCTION_ORDERS;
    const cedProdCompletas = cedProd.filter((o) => (o.estatus as CedicorProdStatus) === "despachado_confeccion").length;
    const cedProdCanceladas = cedProd.filter((o) => (o.estatus as CedicorProdStatus) === "cancelado").length;
    const cedProdAlertas = cedProd.filter((o) => (o.estatus as CedicorProdStatus) === "material_faltante").length;
    const cedProdActivas = cedProd.length - cedProdCompletas - cedProdCanceladas;

    // ── Cedicor — Nuevo Desarrollo ───────────────────────────────────────
    const cedDev = MOCK_CEDICOR_NEW_DEVELOPMENT;
    const cedDevCompletas = cedDev.filter((o) => (o.estatus as CedicorDevStatus) === "despachado_confeccion").length;
    const cedDevCanceladas = cedDev.filter((o) => (o.estatus as CedicorDevStatus) === "cancelado").length;
    const cedDevAlertas = cedDev.filter((o) => (o.estatus as CedicorDevStatus) === "material_faltante").length;
    const cedDevActivas = cedDev.length - cedDevCompletas - cedDevCanceladas;

    return {
      prod, prodActivas, prodFabricando, prodAlertas, prodCompletas, prodVencidas,
      statusDist, alta, media, baja, recientes,
      emb: { total: emb.length, activas: embActivas, completas: embCompletas, alertas: embAlertas },
      cedProd: { total: cedProd.length, activas: cedProdActivas, completas: cedProdCompletas, alertas: cedProdAlertas },
      cedDev: { total: cedDev.length, activas: cedDevActivas, completas: cedDevCompletas, alertas: cedDevAlertas },
    };
  }, []);

  const totalAlertas = stats.prodAlertas.length;

  return (
    <div className="space-y-6">

      {/* ── KPIs principales ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="OPs Activas"
          value={stats.prodActivas.length}
          sub="Órdenes en curso"
          icon={ProduccionIcon}
          iconBg="bg-sky-50 dark:bg-sky-500/10"
          iconText="text-sky-500"
          accentColor="text-sky-500"
          progress={stats.prod.length > 0 ? (stats.prodActivas.length / stats.prod.length) * 100 : 0}
          badge="Activas"
          badgeCls="text-sky-500 bg-sky-50 dark:bg-sky-500/10"
        />
        <KpiCard
          label="En Fabricación"
          value={stats.prodFabricando.length}
          sub="Órdenes en piso"
          icon={FactoryIcon}
          iconBg="bg-violet-50 dark:bg-violet-500/10"
          iconText="text-violet-500"
          accentColor="text-violet-500"
          progress={stats.prod.length > 0 ? (stats.prodFabricando.length / stats.prod.length) * 100 : 0}
        />
        <KpiCard
          label="Alertas"
          value={totalAlertas}
          sub={`${stats.prodAlertas.filter((o) => o.estatus === "material_faltante").length} faltantes · ${stats.prodAlertas.filter((o) => o.estatus === "comprando_materiales").length} comprando`}
          icon={ExclamationTriangleIcon}
          iconBg={totalAlertas > 0 ? "bg-red-50 dark:bg-red-500/10" : "bg-slate-50 dark:bg-slate-500/10"}
          iconText={totalAlertas > 0 ? "text-red-500" : "text-slate-400"}
          accentColor={totalAlertas > 0 ? "text-red-500" : "text-slate-400"}
          progress={stats.prod.length > 0 ? (totalAlertas / stats.prod.length) * 100 : 0}
        />
        <KpiCard
          label="Completadas"
          value={stats.prodCompletas.length}
          icon={CheckCircleIcon}
          iconBg="bg-emerald-50 dark:bg-emerald-500/10"
          iconText="text-emerald-500"
          accentColor="text-emerald-500"
          progress={stats.prod.length > 0 ? (stats.prodCompletas.length / stats.prod.length) * 100 : 0}
          badge={stats.prodVencidas.length > 0 ? `${stats.prodVencidas.length} vencidas` : undefined}
          badgeCls="text-red-500 bg-red-50 dark:bg-red-500/10"
        />
      </div>

      {/* ── Grid central ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

        {/* Módulos de producción (2/3) */}
        <div className="xl:col-span-2 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Módulos de producción</h2>
            <p className="text-xs text-slate-400 mt-0.5">Estado general por área de manufactura</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ModuleCard
              href="/manufacturing/production-orders"
              icon={ProduccionIcon}
              iconBg="bg-sky-50 dark:bg-sky-500/10"
              iconText="text-sky-500"
              title="Órdenes de Producción"
              total={stats.prod.length}
              activas={stats.prodActivas.length}
              completas={stats.prodCompletas.length}
              alertas={totalAlertas}
            />
            <ModuleCard
              href="/manufacturing/embroidery"
              icon={ScissorsIcon}
              iconBg="bg-fuchsia-50 dark:bg-fuchsia-500/10"
              iconText="text-fuchsia-500"
              title="Órdenes de Bordado"
              total={stats.emb.total}
              activas={stats.emb.activas}
              completas={stats.emb.completas}
              alertas={stats.emb.alertas}
            />
            <ModuleCard
              href="/manufacturing/cedicor-production-orders"
              icon={FactoryIcon}
              iconBg="bg-teal-50 dark:bg-teal-500/10"
              iconText="text-teal-500"
              title="Cedicor — Producción"
              total={stats.cedProd.total}
              activas={stats.cedProd.activas}
              completas={stats.cedProd.completas}
              alertas={stats.cedProd.alertas}
            />
            <ModuleCard
              href="/manufacturing/cedicor-product-development-orders"
              icon={LayersIcon}
              iconBg="bg-indigo-50 dark:bg-indigo-500/10"
              iconText="text-indigo-500"
              title="Cedicor — Nuevo Desarrollo"
              total={stats.cedDev.total}
              activas={stats.cedDev.activas}
              completas={stats.cedDev.completas}
              alertas={stats.cedDev.alertas}
            />
          </div>
        </div>

        {/* Panel derecho (1/3): alertas + recientes */}
        <div className="space-y-4">

          {/* Sección de alertas */}
          {totalAlertas > 0 && (
            <div className="rounded-xl bg-white dark:bg-black border border-red-200 dark:border-red-500/20 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <ErrorIcon className="w-4 h-4 text-red-500 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Órdenes en alerta</h3>
                  <p className="text-[11px] text-slate-400">Material faltante o en compra</p>
                </div>
              </div>
              <div>
                {stats.prodAlertas.map((o) => (
                  <AlertRow key={o.id} folio={o.folio} nombre={o.nombre_producto} estatus={o.estatus} />
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
                <p className="text-[11px] text-slate-400">Creadas recientemente</p>
              </div>
              <TrendingUpIcon className="w-4 h-4 text-slate-300 dark:text-slate-600" />
            </div>
            {stats.recientes.map((o) => (
              <AlertRow key={o.id} folio={o.folio} nombre={o.nombre_producto} estatus={o.estatus} />
            ))}
            <Link
              href="/manufacturing/production-orders"
              className="mt-3 flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
            >
              Ver todas las OPs
              <ChevronRightIcon className="w-3 h-3" />
            </Link>
          </div>

          {/* Órdenes vencidas (si hay) */}
          {stats.prodVencidas.length > 0 && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4">
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                    {stats.prodVencidas.length} {stats.prodVencidas.length === 1 ? "orden vencida" : "órdenes vencidas"}
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    Fecha estimada de entrega superada
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sección inferior ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Distribución por estatus */}
        <div className="rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Distribución por estatus</h2>
            <p className="text-xs text-slate-400 mt-0.5">Órdenes de Producción — {stats.prod.length} totales</p>
          </div>
          <div className="space-y-2.5">
            {stats.statusDist.map((item) => {
              const cls = prodStatusCls(item.estatus);
              return (
                <DistBar
                  key={item.estatus}
                  label={PRODUCTION_ORDER_STATUS_LABELS[item.estatus]}
                  count={item.count}
                  total={stats.prod.length}
                  dotCls={cls.dot}
                  textCls={cls.text}
                />
              );
            })}
          </div>
        </div>

        {/* Distribución por prioridad */}
        <div className="rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Prioridad de órdenes</h2>
            <p className="text-xs text-slate-400 mt-0.5">Clasificación de Órdenes de Producción por urgencia</p>
          </div>
          <div className="space-y-4">
            {/* Alta */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" aria-hidden="true" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Alta prioridad</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tabular-nums font-mono text-red-600 dark:text-red-400">{stats.alta}</span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {stats.prod.length > 0 ? Math.round((stats.alta / stats.prod.length) * 100) : 0}%
                  </span>
                </div>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-700"
                  style={{ width: `${stats.prod.length > 0 ? (stats.alta / stats.prod.length) * 100 : 0}%` }}
                />
              </div>
            </div>
            {/* Media */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Media prioridad</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tabular-nums font-mono text-amber-600 dark:text-amber-400">{stats.media}</span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {stats.prod.length > 0 ? Math.round((stats.media / stats.prod.length) * 100) : 0}%
                  </span>
                </div>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-700"
                  style={{ width: `${stats.prod.length > 0 ? (stats.media / stats.prod.length) * 100 : 0}%` }}
                />
              </div>
            </div>
            {/* Baja */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" aria-hidden="true" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Baja prioridad</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tabular-nums font-mono text-slate-500 dark:text-slate-400">{stats.baja}</span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {stats.prod.length > 0 ? Math.round((stats.baja / stats.prod.length) * 100) : 0}%
                  </span>
                </div>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-400 rounded-full transition-all duration-700"
                  style={{ width: `${stats.prod.length > 0 ? (stats.baja / stats.prod.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Totales consolidados */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Total módulo", value: stats.prod.length + stats.emb.total + stats.cedProd.total + stats.cedDev.total, cls: "text-slate-700 dark:text-slate-200" },
              { label: "Activas", value: stats.prodActivas.length + stats.emb.activas + stats.cedProd.activas + stats.cedDev.activas, cls: "text-sky-600 dark:text-sky-400" },
              { label: "Alertas", value: totalAlertas + stats.cedProd.alertas + stats.cedDev.alertas, cls: totalAlertas + stats.cedProd.alertas + stats.cedDev.alertas > 0 ? "text-red-600 dark:text-red-400" : "text-slate-400" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="rounded-lg bg-slate-50 dark:bg-white/5 py-2 px-1">
                <p className={`text-lg font-black tabular-nums font-mono ${cls}`}>{value}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wide mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
