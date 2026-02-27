"use client";

import { OrderList } from "@/src/features/orders/components/OrderList";
import { OrderStats } from "@/src/features/orders/components/OrderStats";
import { OrdenesIcon } from "@/src/components/Icons";

export default function OrdersPage() {
  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Gestiona y monitorea todas las órdenes de venta.
        </p>
      </div>

      {/* Stats */}
      <OrderStats />

      {/* Actions Row */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => {
            document.dispatchEvent(new CustomEvent("orders:exportCSV"));
          }}
          className="px-4 py-2 cursor-pointer bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-full border border-slate-200 dark:border-white/10 shadow-sm transition-all flex items-center gap-2"
          title="Exportar a CSV (Excel)"
          aria-label="Exportar pedidos a CSV"
        >
          <OrdenesIcon className="w-4 h-4" />
          Exportar CSV
        </button>
        <button
          type="button"
          onClick={() => {
            document.dispatchEvent(new CustomEvent("orders:exportPDF"));
          }}
          className="px-4 py-2 cursor-pointer bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-full border border-slate-200 dark:border-white/10 shadow-sm transition-all flex items-center gap-2"
          title="Exportar a PDF"
          aria-label="Exportar pedidos a PDF"
        >
          <OrdenesIcon className="w-4 h-4" />
          Exportar PDF
        </button>
      </div>
      
      
      

      {/* Content */}
      <div className="space-y-6">
        <OrderList />
      </div>
    </div>
  );
}
