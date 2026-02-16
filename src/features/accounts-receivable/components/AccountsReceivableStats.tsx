import { CxcIcon, ClockIcon, ErrorIcon, ListaPreciosIcon } from "@/src/components/Icons";

export const AccountsReceivableStats = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="p-8 rounded-4xl bg-white dark:bg-black border border-slate-100 dark:border-white/20 shadow-xl shadow-slate-200/50 dark:shadow-black/50">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-500/10 text-sky-500">
            <CxcIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
            +9.8%
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Cuentas por Cobrar</p>
        <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">$412,300</h3>
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
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Facturas Pendientes</p>
        <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">$135,750</h3>
      </div>

      <div className="p-8 rounded-4xl bg-white dark:bg-black border border-slate-100 dark:border-white/20 shadow-xl shadow-slate-200/50 dark:shadow-black/50">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500">
            <ListaPreciosIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
            72%
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Cobrado del Mes</p>
        <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">$276,550</h3>
      </div>

      <div className="p-8 rounded-4xl bg-white dark:bg-black border border-slate-100 dark:border-white/20 shadow-xl shadow-slate-200/50 dark:shadow-black/50">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-500">
            <ErrorIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded-lg">
            6
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Vencidas</p>
        <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">$29,450</h3>
      </div>
    </div>
  );
};

