"use client";

import { useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { CloseIcon } from "@/src/components/Icons";

type OrdersQuickFilter = "all" | "activos" | "vencidos";

interface OrdersFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: OrdersQuickFilter;
  onApply: (value: OrdersQuickFilter) => void;
}

export const OrdersFiltersDialog = ({ open, onOpenChange, value, onApply }: OrdersFiltersDialogProps) => {
  const [selectedFilter, setSelectedFilter] = useState<OrdersQuickFilter>(value);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelectedFilter(value);
    }
    onOpenChange(nextOpen);
  };

  const handleApply = () => {
    onApply(selectedFilter);
  };

  return (
    <MainDialog
      hideCloseButton={true}
      title="Filtros de pedidos"
      open={open}
      onOpenChange={handleOpenChange}
      actionButton={
        <button
          type="button"
          onClick={handleApply}
          className="px-4 py-2 rounded-xl border border-sky-600 bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors"
        >
          Aplicar filtros
        </button>
      }
    >
      <div className="space-y-4 mt-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedFilter("activos")}
            className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
              selectedFilter === "activos"
                ? "bg-sky-100 dark:bg-sky-500/20 border-sky-300 dark:border-sky-500 text-sky-800 dark:text-sky-200 cursor-pointer"
                : "bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 cursor-pointer"
            }`}
          >
            Ver Activos
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter("vencidos")}
            className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
              selectedFilter === "vencidos"
                ? "bg-rose-100 dark:bg-rose-500/20 border-rose-300 dark:border-rose-500 text-rose-800 dark:text-rose-100 cursor-pointer"
                : "bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 cursor-pointer"
            }`}
          >
            Ver Vencidos
          </button>
          {
            (selectedFilter !== "all") && (
              <button
                type="button"
                onClick={() => setSelectedFilter("all")}
                className={`inline-flex items-center justify-center w-7 h-7 rounded-full border transition-colors bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border-slate-200 dark:border-white/20 text-slate-400 hover:text-slate-600 dark:text-slate-300 dark:hover:text-slate-100 cursor-pointer`}
                aria-label="Limpiar filtros"
              >
                <CloseIcon className="w-3 h-3" />
              </button>
            )
          }
        </div>
      </div>
    </MainDialog>
  );
};
