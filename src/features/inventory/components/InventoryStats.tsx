

import { InventariosIcon, ListaPreciosIcon, RecepcionesIcon, ErrorIcon } from "../../../components/Icons";

export const InventoryStats = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Stat 1 */}
      <div className="p-8 rounded-4xl bg-white dark:bg-black border border-slate-100 dark:border-white/20 shadow-xl shadow-slate-200/50 dark:shadow-black/50">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500">
            <InventariosIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
            +150
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Productos</p>
        <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">3,450</h3>
      </div>

      {/* Stat 2 */}
      <div className="p-8 rounded-4xl bg-white dark:bg-black border border-slate-100 dark:border-white/20 shadow-xl shadow-slate-200/50 dark:shadow-black/50">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-500">
            <ErrorIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded-lg">
            12
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Bajo Stock</p>
        <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">12 Items</h3>
      </div>

      {/* Stat 3 */}
      <div className="p-8 rounded-4xl bg-white dark:bg-black border border-slate-100 dark:border-white/20 shadow-xl shadow-slate-200/50 dark:shadow-black/50">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500">
            <ListaPreciosIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
            +8.5%
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Valor Inventario</p>
        <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">$1.2M</h3>
      </div>

      {/* Stat 4 */}
      <div className="p-8 rounded-4xl bg-white dark:bg-black border border-slate-100 dark:border-white/20 shadow-xl shadow-slate-200/50 dark:shadow-black/50">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-500/10 text-purple-500">
            <RecepcionesIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
            +24
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Movimientos (Hoy)</p>
        <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">145</h3>
      </div>
    </div>
  );
};
