'use client'

import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { FilterIcon, TrendingUpIcon, SaveIcon } from "../../../components/Icons";

type PipelineStage = {
  label: string;
  count: number;
  amount: string;
  colorClass: string;
  width: number;
};

const STAGES: PipelineStage[] = [
  {
    label: "Calificados",
    count: 28,
    amount: "$450k",
    colorClass: "from-sky-400 to-sky-600",
    width: 65,
  },
  {
    label: "Propuesta",
    count: 12,
    amount: "$180k",
    colorClass: "from-sky-400 to-sky-600",
    width: 45,
  },
  {
    label: "Negociación",
    count: 5,
    amount: "$95k",
    colorClass: "from-sky-400 to-sky-600",
    width: 25,
  },
];

export const SalesPipeline = () => {
  const items: ActionMenuItem[] = [
    {
      label: "Ver por etapa",
      icon: FilterIcon,
    },
    {
      label: "Comparar tendencia",
      icon: TrendingUpIcon,
    },
    {
      label: "Exportar resumen",
      icon: SaveIcon,
    },
  ];

  return (
    <section
      aria-label="Resumen de pipeline"
      className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl shadow-sm p-6 flex flex-col h-full"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold text-slate-800 dark:text-white text-sm">Resumen de Pipeline</h2>
        <ActionMenu items={items} ariaLabel="Opciones de resumen de pipeline" align="start" />
      </div>
      <div className="flex-1 space-y-5">
        {STAGES.map((stage) => {
          return (
            <div key={stage.label} className="relative">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-medium text-slate-600 dark:text-slate-300">{stage.label}</span>
                <span className="font-bold text-slate-800 dark:text-white">{stage.count}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  role="progressbar"
                  aria-label={`${stage.label} ${stage.count}`}
                  aria-valuenow={stage.count}
                  aria-valuemin={0}
                  aria-valuemax={30}
                  className={`h-full rounded-full bg-linear-to-r ${stage.colorClass}`}
                  style={{ width: `${stage.width}%` }}
                />
              </div>
              <div className="absolute right-0 top-5 text-[10px] text-slate-400">{stage.amount}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            Total Pipeline
          </span>
          <span className="text-lg font-bold text-slate-800 dark:text-white font-mono">$725,000</span>
        </div>
      </div>
    </section>
  );
};
