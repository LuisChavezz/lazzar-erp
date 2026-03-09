import { TrendDirectionalIcon, TrendingUpIcon } from "../../../components/Icons";

export const MonthlyGoal = () => {
  return (
    <section className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl p-6 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/20 rounded-full blur-3xl -mr-10 -mt-10" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/20 rounded-full blur-3xl -ml-10 -mb-10" />

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Meta Mensual</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Marzo 2026</p>
          </div>
          <div className="p-2 bg-slate-100 dark:bg-white/10 rounded-lg backdrop-blur-sm">
            <TrendingUpIcon className="w-5 h-5 text-sky-500" />
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-slate-800 dark:text-white">$45,000</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">/ $60k</span>
          </div>
          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            <TrendDirectionalIcon className="w-3 h-3" />
            +12% vs mes anterior
          </p>
        </div>

        <div className="w-full bg-slate-100 dark:bg-white/10 rounded-full h-1.5 mb-2">
          <div className="bg-linear-to-r from-sky-500 to-blue-500 h-1.5 rounded-full w-[75%]" />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
          <span>0%</span>
          <span>75% Completado</span>
          <span>100%</span>
        </div>
      </div>
    </section>
  );
};
