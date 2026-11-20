"use client";

import type { WorkOrderSaldo } from "../utils/formatWorkOrderProgramado";

/**
 * Conteo del paso de cantidades de una orden de trabajo: lo que lleva esta
 * orden contra lo disponible de lo programado por Mesa de Control
 * (programado − ya en órdenes). Rojo cuando se pasa: el envío se bloquea.
 */
export function WorkOrderSaldoCounter({
  saldo,
  selectedTotal,
  destino,
}: {
  saldo: WorkOrderSaldo;
  selectedTotal: number;
  destino: string;
}) {
  const excede = selectedTotal > saldo.disponible;
  const completo = !excede && selectedTotal === saldo.disponible && saldo.disponible > 0;
  const pct = saldo.disponible > 0 ? Math.min(100, Math.round((selectedTotal / saldo.disponible) * 100)) : 100;
  return (
    <div
      aria-live="polite"
      className={`rounded-xl border px-4 py-3 ${
        excede
          ? "border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10"
          : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
          <span
            className={`text-2xl font-bold ${
              excede
                ? "text-rose-600 dark:text-rose-400"
                : completo
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-900 dark:text-white"
            }`}
          >
            {selectedTotal}
          </span>
          <span className="mx-1">de</span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">{saldo.disponible}</span> pzas
          disponibles para {destino}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          Programado {saldo.programado}
          <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
          Ya en órdenes {saldo.enOrdenes}
        </p>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            excede ? "bg-rose-500" : completo ? "bg-emerald-500" : "bg-sky-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {excede && (
        <p className="mt-2 text-xs font-medium text-rose-700 dark:text-rose-300">
          Esta orden lleva {selectedTotal - saldo.disponible} pzas más de lo disponible. Ajusta las cantidades
          o pide a Mesa de Control que programe más.
        </p>
      )}
    </div>
  );
}
