"use client";

import { useState } from "react";
import { OrdenesIcon } from "@/src/components/Icons";
import { OrderSetStatusDialog } from "./OrderSetStatusDialog";

export const OrderActions = () => {
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => setIsStatusDialogOpen(true)}
        className="px-4 py-2 cursor-pointer bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-full border border-slate-200 dark:border-white/10 shadow-sm transition-all flex items-center gap-2"
        title="Actualizar estados"
        aria-label="Actualizar estados de pedidos"
      >
        <OrdenesIcon className="w-4 h-4" />
        Actualizar estados
      </button>
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
      <OrderSetStatusDialog
        open={isStatusDialogOpen}
        onOpenChange={setIsStatusDialogOpen}
      />
    </div>
  );
};
