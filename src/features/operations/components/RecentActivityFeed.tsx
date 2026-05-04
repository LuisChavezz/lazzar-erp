"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuotes } from "@/src/features/quotes/hooks/useQuotes";
import { formatQuoteDateTime } from "@/src/features/quotes/utils/quoteDetailsFormatters";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { getStatusStyles } from "@/src/features/quotes/utils/getStatusStyle";
import { capitalize } from "@/src/utils/capitalize";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { HistoryIcon, ChevronRightIcon } from "@/src/components/Icons";

// ─── Máximo de ítems en el feed ───────────────────────────────────────────────
const MAX_ITEMS = 8;

// ─── Color del indicador por estatus ─────────────────────────────────────────
const dotClass: Record<number, string> = {
  1: "bg-slate-300 dark:bg-slate-600",
  2: "bg-amber-400 animate-pulse",
  3: "bg-emerald-400",
  4: "bg-rose-400",
  5: "bg-violet-400",
};

// ─── Componente ───────────────────────────────────────────────────────────────
export const RecentActivityFeed = () => {
  const { quotes, isLoading } = useQuotes();

  const recent = useMemo(
    () =>
      [...quotes]
        .sort((a, b) => {
          const aTime = new Date(a.updated_at ?? a.created_at).getTime();
          const bTime = new Date(b.updated_at ?? b.created_at).getTime();
          return bTime - aTime;
        })
        .slice(0, MAX_ITEMS),
    [quotes]
  );

  return (
    <section
      className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden flex flex-col"
      aria-label="Actividad reciente de cotizaciones"
    >
      {/* ── Encabezado ──────────────────────────────────────────────────── */}
      <div className="px-6 py-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-sky-100 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <HistoryIcon className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">
            Actividad Reciente
          </h3>
        </div>
        <Link
          href="/sales/quotes"
          className="text-xs text-sky-600 hover:text-sky-500 font-bold uppercase tracking-wider transition-colors flex items-center gap-1 group"
          aria-label="Ver todas las cotizaciones"
        >
          Ver todas
          <ChevronRightIcon className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* ── Contenido ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-140">
            <thead className="text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-50/50 dark:bg-white/2 border-b border-slate-100 dark:border-white/10">
              <tr>
                <th className="px-6 py-3 font-semibold">Cotización</th>
                <th className="px-6 py-3 font-semibold">Cliente</th>
                <th className="px-6 py-3 font-semibold">Estatus</th>
                <th className="px-6 py-3 font-semibold text-right">Importe</th>
                <th className="px-6 py-3 font-semibold text-right">Actualización</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/6">
              {recent.map((quote) => {
                const statusClass = getStatusStyles(quote);
                const dot = dotClass[quote.estatus] ?? dotClass[1];

                return (
                  <tr
                    key={quote.id}
                    className="group hover:bg-slate-50/60 dark:hover:bg-white/2 transition-colors"
                  >
                    {/* ID */}
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                        <span className="text-xs font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                          #{String(quote.id).padStart(5, "0")}
                        </span>
                      </div>
                    </td>

                    {/* Cliente */}
                    <td className="px-6 py-3.5 max-w-48">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                        {quote.cliente_nombre}
                      </p>
                      {quote.oc && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                          OC: {quote.oc}
                        </p>
                      )}
                    </td>

                    {/* Estatus */}
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusClass}`}
                      >
                        {capitalize(quote.estatus_label)}
                      </span>
                    </td>

                    {/* Importe */}
                    <td className="px-6 py-3.5 text-right">
                      <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-200">
                        {formatCurrency(Number(quote.gran_total) || 0)}
                      </span>
                    </td>

                    {/* Fecha */}
                    <td className="px-6 py-3.5 text-right">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        {formatQuoteDateTime(
                          quote.updated_at ?? quote.created_at,
                          "d MMM HH:mm"
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
