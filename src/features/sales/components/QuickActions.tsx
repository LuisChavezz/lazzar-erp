import Link from "next/link";
import { ClockIcon, OrdenesIcon, PedidosIcon, PlusIcon } from "@/src/components/Icons";

export const QuickActions = () => {
  return (
    <section
      aria-label="Acciones rápidas"
      className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl shadow-sm p-5"
    >
      <h2 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider mb-4">
        Accesos Rápidos
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/sales/orders/new"
          aria-label="Crear nueva cotización"
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-sky-50 dark:hover:bg-sky-900/10 hover:text-sky-600 dark:hover:text-sky-400 border border-slate-100 dark:border-white/5 hover:border-sky-200 dark:hover:border-sky-500/20 transition-all group"
        >
          <PlusIcon className="w-6 h-6 mb-2 text-slate-400 group-hover:text-sky-500 transition-colors" aria-hidden="true" />
          <span className="text-[10px] font-medium">Nueva Cotización</span>
        </Link>
        <Link
          href="#"
          aria-label="Crear cotización"
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-100 dark:border-white/5 hover:border-blue-200 dark:hover:border-blue-500/20 transition-all group"
        >
          <OrdenesIcon className="w-6 h-6 mb-2 text-slate-400 group-hover:text-blue-500 transition-colors" aria-hidden="true" />
          <span className="text-[10px] font-medium">Cotización</span>
        </Link>
        <Link
          href="/sales/orders"
          aria-label="Crear pedido"
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-amber-50 dark:hover:bg-amber-900/10 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-100 dark:border-white/5 hover:border-amber-200 dark:hover:border-amber-500/20 transition-all group"
        >
          <PedidosIcon className="w-6 h-6 mb-2 text-slate-400 group-hover:text-amber-500 transition-colors" aria-hidden="true" />
          <span className="text-[10px] font-medium">Pedidos</span>
        </Link>
        <Link
          href="#"
          aria-label="Ver actividad"
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-purple-50 dark:hover:bg-purple-900/10 hover:text-purple-600 dark:hover:text-purple-400 border border-slate-100 dark:border-white/5 hover:border-purple-200 dark:hover:border-purple-500/20 transition-all group"
        >
          <ClockIcon className="w-6 h-6 mb-2 text-slate-400 group-hover:text-purple-500 transition-colors" aria-hidden="true" />
          <span className="text-[10px] font-medium">Actividad</span>
        </Link>
      </div>
    </section>
  );
};
