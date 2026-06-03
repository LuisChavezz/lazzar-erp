/**
 * OrderDetails.tsx
 *
 * Presentational component showing the active purchase order details
 * on the right panel of Step 1.
 *
 * Currently displays static demo data — will be wired to real order
 * data in a future iteration.
 */

import { Building2, Calendar, Package, AlertTriangle } from "lucide-react";

export function OrderDetails() {
  return (
    <div className="rounded-2xl border border-slate-300 dark:border-white/20 bg-white dark:bg-white/5 p-5 shadow-soft">
      {/* Header */}
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-500">
          Detalles de la Orden Activa
        </p>
      </div>

      {/* Provider */}
      <div className="flex items-start gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-500/20">
          <Building2 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Proveedor
          </p>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
            Textiles Premium del Norte S.A.
          </p>
        </div>
      </div>

      {/* Details grid */}
      <div className="mt-3 space-y-3">
        {/* Expected date */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/20">
            <Calendar className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
              Fecha Esperada
            </p>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              24 Oct 2024
            </p>
          </div>
        </div>

        {/* Total items */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
            <Package className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
              Total de Artículos
            </p>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              12 SKUs (450 Unidades)
            </p>
          </div>
        </div>

        {/* Priority */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-500/20">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-700 dark:text-rose-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
              Prioridad
            </p>
            <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 dark:bg-rose-500/20 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:text-rose-400">
              ALTA - URGENTE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
