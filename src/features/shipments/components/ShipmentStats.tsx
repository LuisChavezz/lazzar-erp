import { EmbarquesIcon, TrendingUpIcon, ClockIcon, ErrorIcon } from "@/src/components/Icons";

export const ShipmentStats = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="p-8 rounded-4xl bg-white dark:bg-black border border-slate-100 dark:border-white/20 shadow-xl shadow-slate-200/50 dark:shadow-black/50">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-500/10 text-sky-500">
            <EmbarquesIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
            +3.6%
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Embarques Programados</p>
        <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">86</h3>
      </div>

      <div className="p-8 rounded-4xl bg-white dark:bg-black border border-slate-100 dark:border-white/20 shadow-xl shadow-slate-200/50 dark:shadow-black/50">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500">
            <TrendingUpIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
            92%
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Entregas a Tiempo</p>
        <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">312</h3>
      </div>

      <div className="p-8 rounded-4xl bg-white dark:bg-black border border-slate-100 dark:border-white/20 shadow-xl shadow-slate-200/50 dark:shadow-black/50">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-500">
            <ClockIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-lg">
            18
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">En Ruta</p>
        <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">64</h3>
      </div>

      <div className="p-8 rounded-4xl bg-white dark:bg-black border border-slate-100 dark:border-white/20 shadow-xl shadow-slate-200/50 dark:shadow-black/50">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-500">
            <ErrorIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-lg">
            6
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Incidencias</p>
        <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">14</h3>
      </div>
    </div>
  );
};
