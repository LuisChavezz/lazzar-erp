"use client";

import { useMemo } from "react";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";
import {
  ComprasIcon,
  ClockIcon,
  CheckCircleIcon,
  EmbarquesIcon,
} from "@/src/components/Icons";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isPending(status: number): boolean {
  return status === 2;
}

function isAuthorizedOrComplete(status: number): boolean {
  return [3, 4].includes(status);
}

function isCancelled(status: number): boolean {
  return status === 5;
}

function isDraft(status: number): boolean {
  return status === 1;
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface PurchaseOrderDashboardProps {
  orders: PurchaseOrder[];
}

export function PurchaseOrderDashboard({ orders }: PurchaseOrderDashboardProps) {
  // Agregaciones derivadas de los datos
  const stats = useMemo(() => {
    const total = orders.length;
    const totalValue = orders.reduce((s, o) => s + Number(o.total), 0);

    const pendientes = orders.filter((o) => isPending(o.estatus)).length;
    const autorizadasOCompletadas = orders.filter((o) =>
      isAuthorizedOrComplete(o.estatus),
    ).length;
    const canceladas = orders.filter((o) => isCancelled(o.estatus)).length;
    const borradores = orders.filter((o) => isDraft(o.estatus)).length;

    // Órdenes con tracking activo (en tránsito)
    const conTracking = orders.filter((o) => o.tracking).length;

    // Órdenes críticas con tracking
    const critical = orders
      .filter((o) => o.tracking)
      .sort((a, b) => {
        const etaA = a.tracking?.fecha_estimada_llegada ?? "";
        const etaB = b.tracking?.fecha_estimada_llegada ?? "";
        return etaA.localeCompare(etaB);
      })
      .slice(0, 8);

    // Top 5 por valor total
    const topByValue = [...orders]
      .sort((a, b) => Number(b.total) - Number(a.total))
      .slice(0, 5);

    return {
      total,
      totalValue,
      pendientes,
      autorizadasOCompletadas,
      canceladas,
      borradores,
      conTracking,
      critical,
      topByValue,
    };
  }, [orders]);

  const enAutorizacion = stats.borradores + stats.pendientes;

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

        {/* En ruta / con tracking */}
        <div
          role="listitem"
          className="group relative rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-5 shadow-sm hover:shadow-lg transition-all duration-300"
        >
          <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl bg-linear-to-r from-transparent via-indigo-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
              En tránsito
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 shadow-[0_0_15px_rgba(15,23,42,0.08)]">
              <EmbarquesIcon className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight font-mono">
              {stats.conTracking}
            </h3>
            <span className="text-xs font-semibold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded">
              Con tracking
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            Órdenes con información de rastreo
          </p>
          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden text-indigo-500">
            <div
              className="h-full bg-current rounded-full"
              style={{ width: `${stats.total > 0 ? (stats.conTracking / stats.total) * 100 : 0}%` }}
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
            Borrador + pendiente de autorización
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
                {stats.autorizadasOCompletadas}
              </span>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide mt-0.5">
                Autorizadas / Completadas
              </p>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-white/10 mb-1" />
            <div>
              <span className="text-2xl font-bold text-red-500 dark:text-red-400 tracking-tight font-mono">
                {stats.canceladas}
              </span>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-wide mt-0.5">
                Canceladas
              </p>
            </div>
          </div>
          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden text-emerald-500">
            <div
              className="h-full bg-current rounded-full"
              style={{ width: `${stats.total > 0 ? (stats.autorizadasOCompletadas / stats.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Grid inferior ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* Órdenes con tracking activo */}
        <div className="rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                Órdenes con rastreo
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Órdenes con información de seguimiento
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
                <div
                  key={order.id}
                  className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-white/5 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 font-mono">
                      {order.folio}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {`Proveedor #${order.proveedor}`}
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
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">
                Sin órdenes con tracking activo
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
                    </div>
                    <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden text-slate-400">
                      <div
                        className="h-full bg-current rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {`Proveedor #${order.proveedor}`}
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
