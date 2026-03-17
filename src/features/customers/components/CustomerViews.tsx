"use client";

import { useState } from "react";

type CustomerViewKey =
  | "resumen"
  | "oportunidades"
  | "cotizaciones"
  | "pedidos"
  | "facturas"
  | "archivos";

const viewOptions: Array<{ key: CustomerViewKey; label: string; count?: number }> = [
  { key: "resumen", label: "Resumen" },
  { key: "oportunidades", label: "Oportunidades", count: 2 },
  { key: "cotizaciones", label: "Cotizaciones" },
  { key: "pedidos", label: "Pedidos" },
  { key: "facturas", label: "Facturas" },
  { key: "archivos", label: "Archivos" },
];

export const CustomerViews = () => {
  const [activeView, setActiveView] = useState<CustomerViewKey>("resumen");
  const activeOption = viewOptions.find((view) => view.key === activeView);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-full p-1 border border-slate-200/80 dark:border-white/10 w-fit">
        {viewOptions.map((view) => {
          const isActive = activeView === view.key;
          return (
            <button
              key={view.key}
              type="button"
              onClick={() => setActiveView(view.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-2 ${
                isActive
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-300"
              }`}
            >
              <span>{view.label}</span>
              {view.count ? (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100"
                  }`}
                >
                  {view.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black p-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Vista actual: <span className="font-semibold">{activeOption?.label ?? "Resumen"}</span>
        </p>
      </div>
    </div>
  );
};
