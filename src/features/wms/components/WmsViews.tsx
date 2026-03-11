"use client";

import { useState } from "react";
import { StockList } from "@/src/features/stock/components/StockList";
import { WmsEntries } from "./WmsEntries";
import { WmsOutputs } from "./WmsOutputs";
import { WmsAdjustments } from "./WmsAdjustments";

type WmsViewKey = "existencias" | "entradas" | "salidas" | "ajustes";

const viewOptions: Array<{ key: WmsViewKey; label: string }> = [
  { key: "existencias", label: "Existencias" },
  { key: "entradas", label: "Entradas" },
  { key: "salidas", label: "Salidas" },
  { key: "ajustes", label: "Ajustes" },
];

export const WmsViews = () => {
  const [activeView, setActiveView] = useState<WmsViewKey>("existencias");

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
              className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                isActive
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-300"
              }`}
            >
              {view.label}
            </button>
          );
        })}
      </div>

      {activeView === "existencias" && <StockList />}
      {activeView === "entradas" && <WmsEntries />}
      {activeView === "salidas" && <WmsOutputs />}
      {activeView === "ajustes" && <WmsAdjustments />}
    </div>
  );
};
