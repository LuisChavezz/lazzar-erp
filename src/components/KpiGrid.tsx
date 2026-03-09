import type { ComponentType, SVGProps } from "react";

export type KpiStatus = "positive" | "negative" | "neutral";

export interface KpiItem {
  label: string;
  value: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  iconBgClass: string;
  iconClass: string;
  trendLabel?: string;
  status?: KpiStatus;
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {items.map((item) => {
        const status = item.status ?? "neutral";
        const badge = statusStyles[status];
        const Icon = item.icon;

        return (
          <div
            key={item.label}
            className="p-8 rounded-4xl bg-white dark:bg-black border border-slate-100 dark:border-white/20 shadow-xl shadow-slate-200/50 dark:shadow-black/50"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={`p-3 rounded-2xl ${item.iconBgClass} ${item.iconClass}`}
              >
                <Icon className="w-6 h-6" aria-hidden="true" />
              </div>
              {item.trendLabel && (
                <span
                  className={`text-xs font-semibold ${badge.text} ${badge.bg} px-2 py-1 rounded-lg`}
                >
                  {item.trendLabel}
                </span>
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
              {item.label}
            </p>
            <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">
              {item.value}
            </h3>
          </div>
        );
      })}
    </div>
  );
}
