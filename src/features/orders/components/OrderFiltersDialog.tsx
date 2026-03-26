"use client";

import { useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { FilterSaveToggleButton } from "@/src/components/FormButtons";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { orderFiltersDefault, OrderFiltersValue } from "../stores/order-filters.store";

interface OrderFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: OrderFiltersValue;
  onApply: (value: OrderFiltersValue) => void;
  onSave: (value: OrderFiltersValue) => void;
  onClearSaved: () => void;
  savedValue: OrderFiltersValue;
  personaPagosOptions: { value: string; label: string }[];
}

export const OrderFiltersDialog = ({
  open,
  onOpenChange,
  value,
  onApply,
  onSave,
  onClearSaved,
  savedValue,
  personaPagosOptions,
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

  const toggleAutorizacion = (value: boolean) => {
    setLocalValue((prev) => {
      return {
        ...prev,
        activo: prev.activo === value ? null : value,
      };
    });
  };

  const isFiltersEqual = (first: OrderFiltersValue, second: OrderFiltersValue) => {
    if (first.personaPagos !== second.personaPagos) return false;
    if (first.dateFrom !== second.dateFrom) return false;
    if (first.dateTo !== second.dateTo) return false;
    if (first.minAmount !== second.minAmount) return false;
    if (first.maxAmount !== second.maxAmount) return false;
    return first.activo === second.activo;
  };

  const isSavedValueEmpty = isFiltersEqual(savedValue, orderFiltersDefault);
  const isSavedFilters = !isSavedValueEmpty && isFiltersEqual(localValue, savedValue);

  return (
    <MainDialog
      title="Filtros de pedidos"
      open={open}
      onOpenChange={handleOpenChange}
      maxWidth="720px"
      description="Filtra por estado, contacto de pago, fecha de captura y monto total."
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
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Estado de autorización del pedido">
            <button
              type="button"
              onClick={() => toggleAutorizacion(true)}
              className={`px-3 py-2 text-xs rounded-xl border cursor-pointer transition-colors ${
                localValue.activo === true
                  ? "bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500 text-emerald-800 dark:text-emerald-200"
                  : "bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
              }`}
              aria-pressed={localValue.activo === true}
              aria-label="Filtrar por pedidos autorizados"
            >
              Autorizado
            </button>
            <button
              type="button"
              onClick={() => toggleAutorizacion(false)}
              className={`px-3 py-2 text-xs rounded-xl border cursor-pointer transition-colors ${
                localValue.activo === false
                  ? "bg-amber-100 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500 text-amber-800 dark:text-amber-200"
                  : "bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
              }`}
              aria-pressed={localValue.activo === false}
              aria-label="Filtrar por pedidos por autorizar"
            >
              Por Autorizar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-white/5 p-4">
            <FormSelect
              id="personaPagos"
              name="personaPagos"
              label="Contacto de pago"
              value={localValue.personaPagos}
              onChange={(event) => setLocalValue((prev) => ({ ...prev, personaPagos: event.target.value }))}
              options={personaPagosOptions}
            />
          </div>

          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-white/5 p-4">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Rango de fechas</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormInput
                id="dateFrom"
                name="dateFrom"
                label="Desde"
                type="date"
                value={localValue.dateFrom}
                onChange={(event) => setLocalValue((prev) => ({ ...prev, dateFrom: event.target.value }))}
                className="dark:scheme-dark"
              />
              <FormInput
                id="dateTo"
                name="dateTo"
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
              id="minAmount"
              name="minAmount"
              label="Mayor que"
              type="number"
              min="0"
              placeholder="Mayor que"
              value={localValue.minAmount}
              onChange={(event) => setLocalValue((prev) => ({ ...prev, minAmount: event.target.value }))}
            />
            <FormInput
              id="maxAmount"
              name="maxAmount"
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
