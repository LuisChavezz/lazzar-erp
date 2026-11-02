import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";

/**
 * Estado de carga del panel de Mesa de Control (EC-694) mientras llega la
 * ruta: lo pinta su `loading.tsx`, así que la navegación muestra el armazón al
 * instante y Next prefetchea la ruta hasta aquí.
 *
 * Misma rejilla que `OperationsDashboardPage`: las cuatro tarjetas de
 * `OperationsKpiGrid` (idénticas a su propio estado de carga) y, debajo, la
 * cola de autorización con la actividad reciente y el panel lateral. Al montar
 * la página cada sección muestra su propio skeleton hasta que llegan los datos.
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
          <LoadingSkeleton className="h-96 rounded-2xl" />
          <LoadingSkeleton className="h-80 rounded-2xl" />
        </div>
        <LoadingSkeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}
