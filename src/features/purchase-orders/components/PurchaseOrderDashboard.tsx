"use client";

import { useMemo } from "react";
import type { PurchaseOrderMock } from "../mocks/purchase-orders.mock";
import type { PurchaseOrderLifecycleStatus } from "../interfaces/purchase-order.interface";
import {
  ComprasIcon,
  ClockIcon,
  CheckCircleIcon,
  ErrorIcon,
  EmbarquesIcon,
  RouteIcon,
  WarehouseIcon,
  EditIcon,
} from "@/src/components/Icons";

// ─── Configuración visual del ciclo de vida ───────────────────────────────────

const LIFECYCLE_CFG: Record<
  PurchaseOrderLifecycleStatus,
  {
    label: string;
    shortLabel: string;
    iconBg: string;
    iconText: string;
    dotColor: string;
    barColor: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  borrador: {
    label: "Borrador",
    shortLabel: "Borrador",
    iconBg: "bg-slate-50 dark:bg-slate-500/10",
    iconText: "text-slate-500",
    dotColor: "bg-slate-400",
    barColor: "bg-slate-400",
    badgeBg: "bg-slate-50 dark:bg-slate-500/10",
    badgeText: "text-slate-600 dark:text-slate-400",
  },
  pendiente: {
    label: "Pendiente autorización",
    shortLabel: "Pendiente",
    iconBg: "bg-amber-50 dark:bg-amber-500/10",
    iconText: "text-amber-500",
    dotColor: "bg-amber-400",
    barColor: "bg-amber-400",
    badgeBg: "bg-amber-50 dark:bg-amber-500/10",
    badgeText: "text-amber-700 dark:text-amber-400",
  },
  autorizada: {
    label: "Autorizada",
    shortLabel: "Autorizada",
    iconBg: "bg-sky-50 dark:bg-sky-500/10",
    iconText: "text-sky-500",
    dotColor: "bg-sky-500",
    barColor: "bg-sky-500",
    badgeBg: "bg-sky-50 dark:bg-sky-500/10",
    badgeText: "text-sky-700 dark:text-sky-400",
  },
  en_transito: {
    label: "En tránsito",
    shortLabel: "En tránsito",
    iconBg: "bg-indigo-50 dark:bg-indigo-500/10",
    iconText: "text-indigo-500",
    dotColor: "bg-indigo-500",
    barColor: "bg-indigo-500",
    badgeBg: "bg-indigo-50 dark:bg-indigo-500/10",
    badgeText: "text-indigo-700 dark:text-indigo-400",
  },
  en_aduana: {
    label: "En aduana",
    shortLabel: "Aduana",
    iconBg: "bg-orange-50 dark:bg-orange-500/10",
    iconText: "text-orange-500",
    dotColor: "bg-orange-400",
    barColor: "bg-orange-400",
    badgeBg: "bg-orange-50 dark:bg-orange-500/10",
    badgeText: "text-orange-700 dark:text-orange-400",
  },
  en_camino_almacen: {
    label: "En camino al almacén",
    shortLabel: "En camino",
    iconBg: "bg-violet-50 dark:bg-violet-500/10",
    iconText: "text-violet-500",
    dotColor: "bg-violet-500",
    barColor: "bg-violet-500",
    badgeBg: "bg-violet-50 dark:bg-violet-500/10",
    badgeText: "text-violet-700 dark:text-violet-400",
  },
  recibida: {
    label: "Recibida en almacén",
    shortLabel: "Recibida",
    iconBg: "bg-teal-50 dark:bg-teal-500/10",
    iconText: "text-teal-500",
    dotColor: "bg-teal-500",
    barColor: "bg-teal-500",
    badgeBg: "bg-teal-50 dark:bg-teal-500/10",
    badgeText: "text-teal-700 dark:text-teal-400",
  },
  completada: {
    label: "Completada",
    shortLabel: "Completada",
    iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
    iconText: "text-emerald-500",
    dotColor: "bg-emerald-500",
    barColor: "bg-emerald-500",
    badgeBg: "bg-emerald-50 dark:bg-emerald-500/10",
    badgeText: "text-emerald-700 dark:text-emerald-400",
  },
  cancelada: {
    label: "Cancelada",
    shortLabel: "Cancelada",
    iconBg: "bg-red-50 dark:bg-red-500/10",
    iconText: "text-red-500",
    dotColor: "bg-red-400",
    barColor: "bg-red-400",
    badgeBg: "bg-red-50 dark:bg-red-500/10",
    badgeText: "text-red-700 dark:text-red-400",
  },
};

// Orden de visualización en el funnel
const FUNNEL_STAGES: PurchaseOrderLifecycleStatus[] = [
  "borrador",
  "pendiente",
  "autorizada",
  "en_transito",
  "en_aduana",
  "en_camino_almacen",
  "recibida",
  "completada",
  "cancelada",
];

// Íconos representativos por estado
const STAGE_ICONS: Partial<
  Record<PurchaseOrderLifecycleStatus, React.ComponentType<React.SVGProps<SVGSVGElement>>>
> = {
  borrador: EditIcon,
  pendiente: ClockIcon,
  autorizada: CheckCircleIcon,
  en_transito: EmbarquesIcon,
  en_aduana: RouteIcon,
  en_camino_almacen: EmbarquesIcon,
  recibida: WarehouseIcon,
  completada: CheckCircleIcon,
  cancelada: ErrorIcon,
};

// ─── Subcomponentes ───────────────────────────────────────────────────────────

/** Tarjeta del pipeline — sigue el mismo patrón visual que KpiGrid */
function PipelineCard({
  status,
  count,
  total,
  totalValue,
}: {
  status: PurchaseOrderLifecycleStatus;
  count: number;
  total: number;
  totalValue: number;
}) {
  const cfg = LIFECYCLE_CFG[status];
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const Icon = STAGE_ICONS[status] ?? ComprasIcon;

  return (
    <div className="group relative rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-4 shadow-sm hover:shadow-lg transition-all duration-300">
      {/* Línea de acento superior al hover */}
      <div
        className={`absolute inset-x-0 top-0 h-0.5 rounded-t-xl bg-linear-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-100 transition-opacity ${cfg.iconText}`}
      />

      {/* Header: ícono + conteo */}
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${cfg.iconBg} shadow-[0_0_15px_rgba(15,23,42,0.06)]`}>
          <Icon className={`w-4 h-4 ${cfg.iconText}`} aria-hidden="true" />
        </div>
        <span className={`text-2xl font-bold tabular-nums leading-none tracking-tight font-mono ${cfg.iconText}`}>
          {count}
        </span>
      </div>

      {/* Label y valor */}
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight">
        {cfg.label}
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 tabular-nums">
        {Number(totalValue).toLocaleString("es-MX", {
          style: "currency",
          currency: "MXN",
          maximumFractionDigits: 0,
        })}
      </p>

      {/* Barra de proporción */}
      <div className={`mt-3 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ${cfg.iconText}`}>
        <div className="h-full bg-current rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1 block">
        {pct}% del total
      </span>
    </div>
  );
}

/** Fila de orden crítica en la tabla inferior */
function CriticalOrderRow({ order }: { order: PurchaseOrderMock }) {
  const cfg = LIFECYCLE_CFG[order.lifecycle_status];

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-white/5 last:border-0">
      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dotColor}`} aria-hidden="true" />

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 font-mono">
          {order.folio}
        </p>
        <p className="text-[11px] text-slate-400 truncate">
          {order.proveedor_nombre}
        </p>
      </div>

      {order.tracking?.fecha_estimada_llegada && (
        <div className="text-right shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ETA</p>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {order.tracking.fecha_estimada_llegada}
          </p>
        </div>
      )}

      <span
        className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${cfg.badgeBg} ${cfg.badgeText}`}
      >
        {cfg.shortLabel}
      </span>
    </div>
  );
}

/** Barra horizontal del gráfico de valor por estado */
function ValueBar({
  status,
  value,
  maxValue,
}: {
  status: PurchaseOrderLifecycleStatus;
  value: number;
  maxValue: number;
}) {
  const cfg = LIFECYCLE_CFG[status];
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <span className={`text-[10px] font-bold w-20 shrink-0 text-right ${cfg.iconText}`}>
        {cfg.shortLabel}
      </span>
      <div className="flex-1 h-4 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
        <div
          className={`h-full rounded transition-all duration-700 ${cfg.barColor} opacity-80`}
          style={{ width: `${pct}%` }}
        />
        {value > 0 && (
          <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-semibold text-white/90 tabular-nums leading-none">
            {Number(value).toLocaleString("es-MX", {
              style: "currency",
              currency: "MXN",
              maximumFractionDigits: 0,
            })}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface PurchaseOrderDashboardProps {
  orders: PurchaseOrderMock[];
}

export function PurchaseOrderDashboard({ orders }: PurchaseOrderDashboardProps) {
  // Agregaciones derivadas del mock
  const stats = useMemo(() => {
    const byStatus = new Map<PurchaseOrderLifecycleStatus, { count: number; value: number }>();

    FUNNEL_STAGES.forEach((s) => byStatus.set(s, { count: 0, value: 0 }));

    orders.forEach((o) => {
      const s = o.lifecycle_status;
      const entry = byStatus.get(s)!;
      entry.count += 1;
      entry.value += Number(o.total);
    });

    const total = orders.length;
    const totalValue = orders.reduce((s, o) => s + Number(o.total), 0);

    // Órdenes críticas: en aduana o en camino al almacén
    const critical = orders
      .filter((o) =>
        ["en_aduana", "en_camino_almacen", "en_transito"].includes(o.lifecycle_status),
      )
      .sort((a, b) => {
        // Ordenar por ETA ascendente
        const etaA = a.tracking?.fecha_estimada_llegada ?? "";
        const etaB = b.tracking?.fecha_estimada_llegada ?? "";
        return etaA.localeCompare(etaB);
      })
      .slice(0, 8);

    // Top 5 por valor total
    const topByValue = [...orders]
      .sort((a, b) => Number(b.total) - Number(a.total))
      .slice(0, 5);

    // Valor máximo para el gráfico
    const maxValue = Math.max(...Array.from(byStatus.values()).map((v) => v.value));

    return { byStatus, total, totalValue, critical, topByValue, maxValue };
  }, [orders]);

  const enRuta = (stats.byStatus.get("en_transito")?.count ?? 0) +
    (stats.byStatus.get("en_aduana")?.count ?? 0) +
    (stats.byStatus.get("en_camino_almacen")?.count ?? 0);

  const completadas = stats.byStatus.get("completada")?.count ?? 0;
  const canceladas = stats.byStatus.get("cancelada")?.count ?? 0;
  const enAutorizacion =
    (stats.byStatus.get("borrador")?.count ?? 0) +
    (stats.byStatus.get("pendiente")?.count ?? 0);

  return (
    <div className="space-y-6">

      {/* ── KPIs principales ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" role="list">

        {/* Total OC */}
        <div
          role="listitem"
          className="group relative rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-5 shadow-sm hover:shadow-lg transition-all duration-300"
        >
          <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl bg-linear-to-r from-transparent via-sky-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
              Total OC
            </span>
            <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-500 shadow-[0_0_15px_rgba(15,23,42,0.08)]">
              <ComprasIcon className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight font-mono">
              {stats.total}
            </h3>
            <span className="text-xs font-semibold text-sky-500 bg-sky-50 dark:bg-sky-500/10 px-1.5 py-0.5 rounded">
              Activas
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mb-2">
            {Number(stats.totalValue).toLocaleString("es-MX", {
              style: "currency",
              currency: "MXN",
              maximumFractionDigits: 0,
            })}{" "}
            valor total
          </p>
          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden text-sky-500">
            <div className="h-full bg-current rounded-full" style={{ width: "100%" }} />
          </div>
        </div>

        {/* En ruta / aduana */}
        <div
          role="listitem"
          className="group relative rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-5 shadow-sm hover:shadow-lg transition-all duration-300"
        >
          <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl bg-linear-to-r from-transparent via-indigo-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
              En ruta / aduana
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 shadow-[0_0_15px_rgba(15,23,42,0.08)]">
              <EmbarquesIcon className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight font-mono">
              {enRuta}
            </h3>
            <span className="text-xs font-semibold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded">
              Importaciones
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            Órdenes con tracking activo
          </p>
          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden text-indigo-500">
            <div
              className="h-full bg-current rounded-full"
              style={{ width: `${stats.total > 0 ? (enRuta / stats.total) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Por autorizar */}
        <div
          role="listitem"
          className="group relative rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-5 shadow-sm hover:shadow-lg transition-all duration-300"
        >
          <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl bg-linear-to-r from-transparent via-amber-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
              Por autorizar
            </span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-500 shadow-[0_0_15px_rgba(15,23,42,0.08)]">
              <ClockIcon className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight font-mono">
              {enAutorizacion}
            </h3>
            <span className="text-xs font-semibold text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded">
              Pendiente
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            Borrador + pendiente
          </p>
          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden text-amber-400">
            <div
              className="h-full bg-current rounded-full"
              style={{ width: `${stats.total > 0 ? (enAutorizacion / stats.total) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Cierre: completadas / canceladas */}
        <div
          role="listitem"
          className="group relative rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-5 shadow-sm hover:shadow-lg transition-all duration-300"
        >
          <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl bg-linear-to-r from-transparent via-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
              Cierre
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_rgba(15,23,42,0.08)]">
              <CheckCircleIcon className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-end gap-4 mb-2">
            <div>
              <span className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight font-mono">
                {completadas}
              </span>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide mt-0.5">
                Completadas
              </p>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-white/10 mb-1" />
            <div>
              <span className="text-2xl font-bold text-red-500 dark:text-red-400 tracking-tight font-mono">
                {canceladas}
              </span>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-wide mt-0.5">
                Canceladas
              </p>
            </div>
          </div>
          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden text-emerald-500">
            <div
              className="h-full bg-current rounded-full"
              style={{ width: `${stats.total > 0 ? (completadas / stats.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Grid central ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Pipeline por estado — 9 tarjetas */}
        <div className="lg:col-span-2 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                Pipeline de órdenes
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Distribución por estado del ciclo de vida
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400 tabular-nums">
              {stats.total} OC
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {FUNNEL_STAGES.map((status) => {
              const { count, value } = stats.byStatus.get(status)!;
              return (
                <PipelineCard
                  key={status}
                  status={status}
                  count={count}
                  total={stats.total}
                  totalValue={value}
                />
              );
            })}
          </div>
        </div>

        {/* Valor por estado */}
        <div className="rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-5 shadow-sm">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">
              Valor por estado
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Importe acumulado en cada etapa
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {FUNNEL_STAGES.filter((s) => (stats.byStatus.get(s)?.value ?? 0) > 0).map(
              (status) => (
                <ValueBar
                  key={status}
                  status={status}
                  value={stats.byStatus.get(status)!.value}
                  maxValue={stats.maxValue}
                />
              ),
            )}
          </div>
        </div>
      </div>

      {/* ── Fila inferior ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* Órdenes críticas en tránsito */}
        <div className="rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                Órdenes críticas
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                En tránsito · aduana · camino al almacén
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              {stats.critical.length} activas
            </span>
          </div>
          <div>
            {stats.critical.length > 0 ? (
              stats.critical.map((order) => (
                <CriticalOrderRow key={order.id} order={order} />
              ))
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">
                Sin órdenes críticas activas
              </p>
            )}
          </div>
        </div>

        {/* Top 5 por valor */}
        <div className="rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                Top 5 por valor
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Órdenes de mayor importe
              </p>
            </div>
          </div>
          <div className="space-y-1">
            {stats.topByValue.map((order, idx) => {
              const cfg = LIFECYCLE_CFG[order.lifecycle_status];
              const pct =
                stats.topByValue[0]
                  ? (Number(order.total) / Number(stats.topByValue[0].total)) * 100
                  : 0;

              return (
                <div key={order.id} className="flex items-center gap-3 py-2">
                  {/* Rank */}
                  <span className="text-xs font-black text-slate-300 dark:text-slate-600 w-4 tabular-nums">
                    {idx + 1}
                  </span>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 font-mono">
                        {order.folio}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${cfg.badgeBg} ${cfg.badgeText}`}
                      >
                        <span className={`w-1 h-1 rounded-full ${cfg.dotColor}`} />
                        {cfg.shortLabel}
                      </span>
                    </div>
                    <div className={`h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ${cfg.iconText}`}>
                      <div
                        className="h-full bg-current rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {order.proveedor_nombre}
                    </p>
                  </div>
                  {/* Valor */}
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums shrink-0">
                    {Number(order.total).toLocaleString("es-MX", {
                      style: "currency",
                      currency: "MXN",
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
