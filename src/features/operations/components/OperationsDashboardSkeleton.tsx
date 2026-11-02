import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { ChevronRightIcon, ClockIcon, HistoryIcon } from "@/src/components/Icons";

// Mismos marcos que las secciones del panel (`PendingApprovalQueue`,
// `RecentActivityFeed`, `OperationsQuotesStatusBreakdown`).
const panelClassName =
  "bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden flex flex-col";
const panelHeaderClassName =
  "px-6 py-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/2 shrink-0";

/**
 * Estado de carga del panel de Mesa de Control (EC-694) mientras llega la
 * ruta: lo pinta su `loading.tsx`, así que la navegación muestra el armazón al
 * instante y Next prefetchea la ruta hasta aquí.
 *
 * Reproduce, con el mismo marcado y las mismas medidas, lo que cada sección de
 * `OperationsDashboardPage` pinta mientras carga sus datos (tarjetas de
 * `OperationsKpiGrid`, cola de autorización, actividad reciente y distribución
 * por estatus): al montar la página cada sección ocupa exactamente el hueco de
 * su skeleton y no hay salto. Si cambia el estado de carga de una sección,
 * cambia también aquí.
 */
export function OperationsDashboardSkeleton() {
  return (
    <div className="w-full space-y-6" role="status" aria-label="Cargando panel de Mesa de Control">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <LoadingSkeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 space-y-6">
          {/* Cola de autorización */}
          <div className={panelClassName}>
            <div className={panelHeaderClassName}>
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <ClockIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                    Cola de Autorización
                  </h3>
                  <div className="mt-1 w-40" aria-hidden="true">
                    <LoadingSkeleton className="h-3 rounded-full" />
                  </div>
                </div>
              </div>
              <div className="w-6" aria-hidden="true">
                <LoadingSkeleton className="h-6 rounded-full" />
              </div>
            </div>
            <div className="max-h-128 overflow-y-auto">
              <div className="p-4 space-y-3">
                {Array.from({ length: 6 }, (_, index) => (
                  <LoadingSkeleton key={index} className="h-18 rounded-xl" />
                ))}
              </div>
            </div>
          </div>

          {/* Actividad reciente */}
          <div className={panelClassName}>
            <div className={panelHeaderClassName}>
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-md bg-sky-100 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <HistoryIcon className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                  Actividad Reciente
                </h3>
              </div>
              <span
                className="text-xs text-sky-600 font-bold uppercase tracking-wider flex items-center gap-1"
                aria-hidden="true"
              >
                Ver todas
                <ChevronRightIcon className="w-3 h-3" />
              </span>
            </div>
            <div className="flex-1 p-4 space-y-3">
              {Array.from({ length: 6 }, (_, index) => (
                <LoadingSkeleton key={index} className="h-12 rounded-lg" />
              ))}
            </div>
          </div>
        </div>

        {/* Distribución por estatus */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl shadow-sm p-6 flex flex-col min-h-88">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-5">
              Distribución por Estatus
            </h3>
            <div className="space-y-3.5 flex-1">
              {Array.from({ length: 5 }, (_, index) => (
                <LoadingSkeleton key={index} className="h-9 rounded-lg" />
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/6 space-y-2">
              <LoadingSkeleton className="h-4 rounded-lg" />
              <LoadingSkeleton className="h-4 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
