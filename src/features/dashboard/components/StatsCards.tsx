import { TrendingUpIcon, PedidosIcon, ClockIcon, OrdenesIcon } from "../../../components/Icons";

export const StatsCards = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
      {/* Stat 1 */}
      <div className="p-8 rounded-4xl bg-white dark:bg-black border border-slate-100 dark:border-white/20 shadow-xl shadow-slate-200/50 dark:shadow-black/50">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-500/10 text-sky-500">
            <TrendingUpIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
            +12.5%
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Ingresos Totales</p>
        <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">$124,500.00</h3>
      </div>

      {/* Stat 2 */}
      <div className="p-8 rounded-4xl bg-white dark:bg-black border border-slate-100 dark:border-white/20 shadow-xl shadow-slate-200/50 dark:shadow-black/50">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-500/10 text-sky-500">
            <PedidosIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
            0.0%
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Pedidos Activos</p>
        <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">45</h3>
      </div>

      {/* Stat 3 */}
      <div className="p-8 rounded-4xl bg-white dark:bg-black border border-slate-100 dark:border-white/20 shadow-xl shadow-slate-200/50 dark:shadow-black/50">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-2xl bg-orange-50 dark:bg-orange-500/10 text-orange-500">
            <ClockIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded-lg">
            -2.4%
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Tiempo Promedio</p>
        <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">12m 30s</h3>
      </div>
      {/* Stat 4 */}
      <div className="p-8 rounded-4xl bg-white dark:bg-black border border-slate-100 dark:border-white/20 shadow-xl shadow-slate-200/50 dark:shadow-black/50">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-500/10 text-purple-500">
            <OrdenesIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
            +8.4%
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total de Ordenes</p>
        <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">1,234</h3>
      </div>
    </div>
  );
}
