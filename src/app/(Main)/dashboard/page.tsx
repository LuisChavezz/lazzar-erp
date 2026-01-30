import { StatsCards } from "@/src/features/dashboard/components/StatsCards";
import { OrdersTable } from "@/src/features/dashboard/components/OrdersTable";


export default function DashboardPage() {
  return (
    <div className="max-w-5xl mx-auto py-12 md:py-20">
      <div className="text-left">
        <span className="inline-block py-1 px-3 rounded-full bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-bold tracking-wider mb-6 border border-sky-100 dark:border-sky-500/20">
          VERSION 2.0
        </span>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 ">
          Bienvenido a tu <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-linear-to-r from-sky-500 to-cyan-500">
            ERP Inteligente
          </span>
        </h1>
        <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl ">
          Gestiona pedidos, producción, inventarios y finanzas desde un panel unificado. Diseñado para
          velocidad y control total.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <button className="px-6 py-3 rounded-full cursor-pointer bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-lg shadow-sky-500/30 hover:shadow-sky-500/40 transition transform active:scale-95">
            Nuevo Pedido
          </button>
          <button className="px-6 py-3 rounded-full cursor-pointer bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition transform active:scale-95">
            Ver Reportes
          </button>
          <button className="px-6 py-3 rounded-full cursor-pointer bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition transform active:scale-95">
            Configuración
          </button>
        </div>
      </div>

      <StatsCards />

      <OrdersTable />
    </div>
  );
}
