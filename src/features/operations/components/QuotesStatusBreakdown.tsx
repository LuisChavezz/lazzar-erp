"use client";

import { useMemo } from "react";
import { useQuotes } from "@/src/features/quotes/hooks/useQuotes";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { KANBAN_COLUMNS } from "@/src/features/quotes/constants/kanbanColumns";

// ─── Mapa de colores por estatus ──────────────────────────────────────────────
const COLOR_MAP: Record<
  number,
  { dot: string; bar: string; text: string }
> = {
  1: {
    dot: "bg-slate-400",
    bar: "bg-slate-400",
    text: "text-slate-600 dark:text-slate-300",
  },
  2: {
    dot: "bg-amber-400",
    bar: "bg-amber-400",
    text: "text-amber-700 dark:text-amber-300",
  },
  3: {
    dot: "bg-emerald-400",
    bar: "bg-emerald-400",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  4: {
    dot: "bg-rose-400",
    bar: "bg-rose-400",
    text: "text-rose-700 dark:text-rose-300",
  },
  5: {
    dot: "bg-violet-400",
    bar: "bg-violet-400",
    text: "text-violet-700 dark:text-violet-300",
  },
};

// ─── Componente ───────────────────────────────────────────────────────────────
export const QuotesStatusBreakdown = () => {
  const { quotes, isLoading } = useQuotes();

  const rows = useMemo(() => {
    const total = quotes.length;
    return KANBAN_COLUMNS.map((col) => {
      const group = quotes.filter((q) => q.estatus === col.estatus);
      const count = group.length;
      const amount = group.reduce(
        (sum, q) => sum + (Number(q.gran_total) || 0),
        0
      );
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return { ...col, count, amount, pct };
    });
  }, [quotes]);

  const totalAmount = useMemo(
    () => quotes.reduce((sum, q) => sum + (Number(q.gran_total) || 0), 0),
    [quotes]
  );

  return (
    <section
      className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl shadow-sm p-6 flex flex-col"
      aria-label="Distribución de cotizaciones por estatus"
    >
      <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-5">
        Distribución por Estatus
      </h3>

      {isLoading ? (
        <div className="space-y-3.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-9 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-3.5">
          {rows.map((row) => {
            const colors = COLOR_MAP[row.estatus] ?? COLOR_MAP[1];
            return (
              <div key={row.id}>
                {/* Etiqueta + valores */}
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`}
                    />
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {row.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      {formatCurrency(row.amount)}
                    </span>
                    <span className={`font-bold tabular-nums ${colors.text}`}>
                      {row.count}
                    </span>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    role="progressbar"
                    aria-valuenow={row.pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${row.label}: ${row.pct}%`}
                    className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Totales */}
      {!isLoading && (
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/6 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">
              Total cotizaciones
            </span>
            <span className="text-sm font-bold tabular-nums text-slate-800 dark:text-white">
              {quotes.length}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">
              Importe total
            </span>
            <span className="text-sm font-bold font-mono text-slate-800 dark:text-white">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>
      )}
    </section>
  );
};
