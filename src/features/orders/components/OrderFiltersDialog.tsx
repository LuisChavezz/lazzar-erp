"use client";

import { useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { FilterSaveToggleButton } from "@/src/components/FormButtons";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { Order } from "../interfaces/order.interface";
import { orderFiltersDefault, OrderFiltersValue } from "../stores/order-filters.store";

interface OrderFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: OrderFiltersValue;
  onApply: (value: OrderFiltersValue) => void;
  onSave: (value: OrderFiltersValue) => void;
  onClearSaved: () => void;
  savedValue: OrderFiltersValue;
}

export const OrderFiltersDialog = ({
  open,
  onOpenChange,
  value,
  onApply,
  onSave,
  onClearSaved,
  savedValue,
}: OrderFiltersDialogProps) => {
  const [localValue, setLocalValue] = useState<OrderFiltersValue>(value);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setLocalValue(value);
    }
    onOpenChange(nextOpen);
  };

  const handleApply = () => {
    onApply(localValue);
  };

  const handleSave = () => {
    if (isSavedFilters) {
      onClearSaved();
      return;
    }
    onSave(localValue);
  };

  const toggleStatus = (status: Order["estatusPedido"]) => {
    setLocalValue((prev) => {
      const exists = prev.statuses.includes(status);
      return {
        ...prev,
        statuses: exists ? prev.statuses.filter((item) => item !== status) : [...prev.statuses, status],
      };
    });
  };

  const isFiltersEqual = (first: OrderFiltersValue, second: OrderFiltersValue) => {
    if (first.agente !== second.agente) return false;
    if (first.dateFrom !== second.dateFrom) return false;
    if (first.dateTo !== second.dateTo) return false;
    if (first.minAmount !== second.minAmount) return false;
    if (first.maxAmount !== second.maxAmount) return false;
    if (first.statuses.length !== second.statuses.length) return false;
    return first.statuses.every((status) => second.statuses.includes(status));
  };

  const isSavedValueEmpty = isFiltersEqual(savedValue, orderFiltersDefault);
  const isSavedFilters = !isSavedValueEmpty && isFiltersEqual(localValue, savedValue);

  return (
    <MainDialog
      hideCloseButton={true}
      title="Filtros de pedidos"
      open={open}
      onOpenChange={handleOpenChange}
      maxWidth="720px"
      description="Filtra por estado, vendedor, fecha de captura y monto total."
      actionButtonClose={false}
      actionButton={
        <div className="flex items-center gap-3">
          <FilterSaveToggleButton isActive={isSavedFilters} onClick={handleSave} />
          <button
            type="button"
            onClick={handleApply}
            className="h-10 px-4 rounded-xl border cursor-pointer border-sky-600 bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors inline-flex items-center justify-center"
          >
            Aplicar
          </button>
        </div>
      }
    >
      <div className="space-y-6 mt-2">
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5 p-4">
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Estado</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="group" aria-label="Estados del pedido">
            {(["Pendiente", "Parcial", "Completo", "Cancelado"] as Order["estatusPedido"][]).map((status) => {
              const isActive = localValue.statuses.includes(status);
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => toggleStatus(status)}
                  className={`px-3 py-2 text-xs rounded-xl border cursor-pointer transition-colors ${
                    isActive
                      ? "bg-sky-100 dark:bg-sky-500/20 border-sky-300 dark:border-sky-500 text-sky-800 dark:text-sky-200"
                      : "bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
                  }`}
                  aria-pressed={isActive}
                  aria-label={`Estado ${status}`}
                >
                  {status}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-white/5 p-4">
            <FormSelect
              label="Agente"
              value={localValue.agente}
              onChange={(event) => setLocalValue((prev) => ({ ...prev, agente: event.target.value }))}
              options={[
                { value: "", label: "Todos" },
                { value: "1", label: "Vendedor 1" },
                { value: "2", label: "Vendedor 2" },
              ]}
            />
          </div>

          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-white/5 p-4">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Rango de fechas</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormInput
                label="Desde"
                type="date"
                value={localValue.dateFrom}
                onChange={(event) => setLocalValue((prev) => ({ ...prev, dateFrom: event.target.value }))}
                className="dark:scheme-dark"
              />
              <FormInput
                label="Hasta"
                type="date"
                value={localValue.dateTo}
                onChange={(event) => setLocalValue((prev) => ({ ...prev, dateTo: event.target.value }))}
                className="dark:scheme-dark"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-white/5 p-4">
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Monto total</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormInput
              label="Mayor que"
              type="number"
              min="0"
              placeholder="Mayor que"
              value={localValue.minAmount}
              onChange={(event) => setLocalValue((prev) => ({ ...prev, minAmount: event.target.value }))}
            />
            <FormInput
              label="Menor que"
              type="number"
              min="0"
              placeholder="Menor que"
              value={localValue.maxAmount}
              onChange={(event) => setLocalValue((prev) => ({ ...prev, maxAmount: event.target.value }))}
            />
          </div>
        </div>
      </div>
    </MainDialog>
  );
};
