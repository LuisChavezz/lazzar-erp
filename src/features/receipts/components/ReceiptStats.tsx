import { TrendingUpIcon, ClockIcon, CheckCircleIcon, InventariosIcon } from "../../../components/Icons";

export const ReceiptStats = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Stat 1 */}
      <div className="p-8 rounded-4xl bg-white dark:bg-black border border-slate-100 dark:border-white/20 shadow-xl shadow-slate-200/50 dark:shadow-black/50">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-500">
            <InventariosIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
            +5.2%
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Recepciones Hoy</p>
        <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">24</h3>
      </div>

      {/* Stat 2 */}
      <div className="p-8 rounded-4xl bg-white dark:bg-black border border-slate-100 dark:border-white/20 shadow-xl shadow-slate-200/50 dark:shadow-black/50">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-500">
            <ClockIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-lg">
            3 Activas
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Pendientes de Descarga</p>
        <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">8</h3>
      </div>

      {/* Stat 3 */}
      <div className="p-8 rounded-4xl bg-white dark:bg-black border border-slate-100 dark:border-white/20 shadow-xl shadow-slate-200/50 dark:shadow-black/50">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500">
            <CheckCircleIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
            +12%
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Completadas (Semana)</p>
        <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">156</h3>
      </div>

      {/* Stat 4 */}
      <div className="p-8 rounded-4xl bg-white dark:bg-black border border-slate-100 dark:border-white/20 shadow-xl shadow-slate-200/50 dark:shadow-black/50">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-500/10 text-purple-500">
            <TrendingUpIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
            98.5%
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Eficiencia Recepción</p>
        <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">High</h3>
      </div>
    </div>
  );
};
