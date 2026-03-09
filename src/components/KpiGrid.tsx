import type { ComponentType, SVGProps } from "react";
import { KpiTrendIcon } from "./Icons";

export type KpiStatus = "positive" | "negative" | "neutral";

export interface KpiItem {
  label: string;
  value: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  iconBgClass: string;
  iconClass: string;
  trendLabel?: string;
  status?: KpiStatus;
  subLabel?: string;
  progress?: number;
}

interface KpiGridProps {
  items: KpiItem[];
}

const statusStyles: Record<KpiStatus, { text: string; bg: string }> = {
  positive: { text: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  negative: { text: "text-red-500", bg: "bg-red-50 dark:bg-red-500/10" },
  neutral: { text: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
};

export default function KpiGrid({ items }: KpiGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => {
        const status = item.status ?? "neutral";
        const badge = statusStyles[status];
        const Icon = item.icon;
        const progress =
          item.progress ?? (status === "positive" ? 70 : status === "neutral" ? 55 : 40);

        return (
          <div
            key={item.label}
            className="group relative rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-5 shadow-sm hover:shadow-lg transition-all duration-300"
          >
            <div
              className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-100 transition-opacity ${item.iconClass}`}
            />
            <div className="flex justify-between items-start mb-4">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {item.label}
                </span>
                {item.subLabel ? (
                  <span className="text-xs text-slate-400 mt-1">{item.subLabel}</span>
                ) : null}
              </div>
              <div
                className={`p-2 rounded-lg ${item.iconBgClass} ${item.iconClass} shadow-[0_0_15px_rgba(15,23,42,0.08)]`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <h3 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight font-mono">
                {item.value}
              </h3>
              {item.trendLabel ? (
                <span
                  className={`flex items-center text-xs font-semibold ${badge.text} ${badge.bg} px-1.5 py-0.5 rounded`}
                >
                  <KpiTrendIcon className="w-3 h-3 mr-0.5" negative={status === "negative"} />
                  {item.trendLabel}
                </span>
              ) : null}
            </div>
            <div className={`h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ${item.iconClass}`}>
              <div className="h-full bg-current rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
