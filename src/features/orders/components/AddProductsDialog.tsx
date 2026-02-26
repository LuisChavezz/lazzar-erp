"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { FormInput } from "@/src/components/FormInput";
import { useAddProductsDialog } from "../hooks/useAddProductsDialog";
import { AddProductsSelectableItem } from "./AddProductsSelectableItem";
import { OrderFormValues } from "../schema/order.schema";

type OrderItem = OrderFormValues["items"][number];

interface AddProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingSkus: Set<string>;
  onAddItems: (items: OrderItem[]) => void;
}

export function AddProductsDialog({
  open,
  onOpenChange,
  existingSkus,
  onAddItems,
}: AddProductsDialogProps) {
  const {
    search,
    setSearch,
    rows,
    filteredRows,
    selectableSelectedCount,
    handleOpenChange,
    toggleRow,
    handleAddSelected,
    isSelected,
    isAlreadyAdded,
  } = useAddProductsDialog({
    open,
    onOpenChange,
    existingSkus,
    onAddItems,
  });

  return (
    <MainDialog
      maxWidth="720px"
      title="Agregar productos"
      open={open}
      onOpenChange={handleOpenChange}
      actionButton={
        <button
          type="button"
          onClick={handleAddSelected}
          disabled={selectableSelectedCount === 0}
          className="px-4 py-2 rounded-xl cursor-pointer bg-sky-600 text-white text-xs font-bold uppercase tracking-wide hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-default"
        >
          Agregar ({selectableSelectedCount})
        </button>
      }
    >
      <div className="space-y-4 mt-2">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="flex-1">
            <FormInput
              placeholder="Buscar por SKU, nombre o descripción..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div
          className="max-h-100 overflow-y-auto custom-scrollbar space-y-2"
          role="list"
          aria-label="Catálogo de productos"
        >
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No hay productos disponibles. Revisa Configuración &gt; Productos y Variantes.
            </p>
          ) : filteredRows.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No se encontraron productos.
            </p>
          ) : (
            filteredRows.map((row) => {
              return (
                <AddProductsSelectableItem
                  key={row.id}
                  row={row}
                  isSelected={isSelected(row.id)}
                  isAlreadyAdded={isAlreadyAdded(row.sku)}
                  onToggle={toggleRow}
                />
              );
            })
          )}
        </div>
      </div>
    </MainDialog>
  );
}
