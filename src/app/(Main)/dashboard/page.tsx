import { StatsCards } from "@/src/features/dashboard/components/StatsCards";
import { authOptions } from "@/src/lib/auth";
import { hasPermission } from "@/src/utils/permissions";
import { getServerSession } from "next-auth";
import Link from "next/link";


export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const canReadConfig = hasPermission("R-CONF", session?.user);
  const canReadOrders = hasPermission("R-PEDID", session?.user);

  return (
    <div className="w-full">

      <div className="mt-4 flex flex-wrap gap-4 ">
        {canReadOrders && (
          <Link
            href="/orders/new"
            className="px-6 py-3 rounded-full cursor-pointer bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-lg shadow-sky-500/30 hover:shadow-sky-500/40 transition transform active:scale-95"
          >
            Nuevo Pedido
          </Link>
        )}
        {/* <button className="px-6 py-3 rounded-full cursor-pointer bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition transform active:scale-95">
          Ver Reportes
        </button> */}
        {canReadConfig && (
          <Link href="/config" className="px-6 py-3 rounded-full cursor-pointer bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition transform active:scale-95">
            Configuración
          </Link>
        )}
      </div>
      
      <StatsCards />
    </div>
  );
}
