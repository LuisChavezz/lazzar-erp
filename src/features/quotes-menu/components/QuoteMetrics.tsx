import React from "react";
import { OrderMetricItem } from "@/src/features/quotes-menu/utils/quote-metrics.util";

interface QuoteMetricsProps {
  metrics: OrderMetricItem[];
}

export function QuoteMetrics({ metrics }: QuoteMetricsProps) {
  return (
    <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-6 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        
        const colorStyles = {
          sky: {
            bg: "bg-sky-50 dark:bg-sky-500/10",
            text: "text-sky-600 dark:text-sky-400",
            icon: "text-sky-500",
            dot: "bg-sky-500",
          },
          blue: {
            bg: "bg-blue-50 dark:bg-blue-500/10",
            text: "text-blue-600 dark:text-blue-400",
            icon: "text-blue-500",
            dot: "bg-blue-500",
          },
          emerald: {
            bg: "bg-emerald-50 dark:bg-emerald-500/10",
            text: "text-emerald-600 dark:text-emerald-400",
            icon: "text-emerald-500",
            dot: "bg-emerald-500",
          },
          amber: {
            bg: "bg-amber-50 dark:bg-amber-500/10",
            text: "text-amber-600 dark:text-amber-400",
            icon: "text-amber-500",
            dot: "bg-amber-500",
          },
          violet: {
            bg: "bg-violet-50 dark:bg-violet-500/10",
            text: "text-violet-600 dark:text-violet-400",
            icon: "text-violet-500",
            dot: "bg-violet-500",
          },
          indigo: {
            bg: "bg-indigo-50 dark:bg-indigo-500/10",
            text: "text-indigo-600 dark:text-indigo-400",
            icon: "text-indigo-500",
            dot: "bg-indigo-500",
          },
        };

        const styles = colorStyles[metric.color] || colorStyles.sky;

        return (
          <div
            key={index}
            className="flex flex-col gap-3 p-4 rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none transition-all hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {metric.label}
              </span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${styles.bg}`}>
                <Icon className={`w-4 h-4 ${styles.icon}`} />
              </div>
            </div>
            
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-display leading-none">
              {metric.value}
            </span>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
              <span>{metric.footer}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
