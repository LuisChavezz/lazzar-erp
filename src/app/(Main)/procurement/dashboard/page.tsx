"use client";

import { ProcurementRouteSkeleton } from "@/src/components/ProcurementRouteSkeleton";
import { usePurchaseOrderKpis } from "@/src/features/purchase-orders/hooks/usePurchaseOrderKpis";
import { PurchaseOrderDashboard } from "@/src/features/purchase-orders/components/PurchaseOrderDashboard";

export default function ProcurementDashboardPage() {
  // Los indicadores de OC (`GET /compras/ordenes/kpis/`), no el listado
  // completo: el backend ya calcula conteos, valor, top 5 y entregas próximas.
  // Misma llave que las tarjetas de la lista de OC, así que comparten caché.
  const { data, isInitialError } = usePurchaseOrderKpis();

  // Solo si nunca cargó: un refetch fallido conserva el panel y avisa por toast
  // desde `usePurchaseOrderKpis`.
  if (isInitialError) {
    return (
      <div className="px-1 pb-8">
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
            Error al cargar el panel de compras
          </p>
        </div>
      </div>
    );
  }

  // Mismo skeleton que el `loading.tsx` de la ruta: sin spinner intermedio.
  if (!data) {
    return <ProcurementRouteSkeleton variant="dashboard" />;
  }

  // Sin `<h1>` propio: el encabezado global ya titula la página ("Panel de
  // compras"), y repetirlo empujaba el contenido hacia abajo.
  return (
    <div className="px-1 pb-8 space-y-4 sm:space-y-6">
      <PurchaseOrderDashboard kpis={data} />
    </div>
  );
}
