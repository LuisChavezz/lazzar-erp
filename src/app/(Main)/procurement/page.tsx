"use client";

import { usePurchaseOrders } from "@/src/features/purchase-orders/hooks/usePurchaseOrders";
import { PurchaseOrderDashboard } from "@/src/features/purchase-orders/components/PurchaseOrderDashboard";

export default function ProcurementPage() {
  const { purchaseOrders, isLoading, isInitialError } = usePurchaseOrders();

  if (isLoading) {
    return (
      <div className="px-1 pb-8">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
          <span className="ml-3 text-sm text-slate-500">
            Cargando panel de compras...
          </span>
        </div>
      </div>
    );
  }

  // Solo si el listado nunca cargó: un refetch fallido conserva el panel y
  // avisa por toast desde `usePurchaseOrders`.
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

  return (
    <div className="px-1 pb-8">
      <div className="mb-6">
        <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
          Compras
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Resumen del ciclo de vida de órdenes de compra e importaciones
        </p>
      </div>
      <PurchaseOrderDashboard orders={purchaseOrders} />
    </div>
  );
}
