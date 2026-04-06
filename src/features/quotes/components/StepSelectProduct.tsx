import { memo } from "react";
import { FormInput } from "@/src/components/FormInput";
import { AddProductsSelectableItem } from "./AddProductsSelectableItem";
import type { CatalogRow } from "./AddProductDialog";

interface StepSelectProductProps {
  search: string;
  onSearchChange: (value: string) => void;
  rows: CatalogRow[];
  filteredRows: CatalogRow[];
  selectedRowIds: Set<number>;
  onToggleRow: (row: CatalogRow) => void;
  hasEmbroidery: boolean;
  onToggleEmbroidery: (value: boolean) => void;
}

export const StepSelectProduct = memo(function StepSelectProduct({
  search,
  onSearchChange,
  rows,
  filteredRows,
  selectedRowIds,
  onToggleRow,
  hasEmbroidery,
  onToggleEmbroidery,
}: StepSelectProductProps) {
  const selectedCount = selectedRowIds.size;

  return (
    <div className="space-y-4 mt-2">
      <div
        className="flex flex-col md:flex-row gap-3 md:items-center"
        role="search"
        aria-label="Buscar productos"
      >
        <div className="flex-1">
          <FormInput
            placeholder="Buscar por nombre o descripción..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label="Buscar productos"
          />
        </div>
      </div>

      <div
        className="max-h-88 overflow-y-auto custom-scrollbar space-y-2"
        role="list"
        aria-label="Catálogo de productos"
      >
        <p className="sr-only" aria-live="polite">
          {filteredRows.length} productos visibles
        </p>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No hay productos disponibles. Revisa Configuración &gt; Productos.
          </p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No se encontraron productos.
          </p>
        ) : (
          filteredRows.map((row) => (
            <AddProductsSelectableItem
              key={row.id}
              row={row}
              isSelected={selectedRowIds.has(row.id)}
              isAlreadyAdded={false}
              onToggle={onToggleRow}
            />
          ))
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/10">
        <label
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none"
          htmlFor="select-product-bordados"
        >
          <input
            id="select-product-bordados"
            type="checkbox"
            checked={hasEmbroidery}
            onChange={(event) => onToggleEmbroidery(event.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          Agregar bordado
        </label>
        {selectedCount > 0 && (
          <span className="text-xs font-semibold text-sky-600 dark:text-sky-400" aria-live="polite">
            {selectedCount} {selectedCount === 1 ? "producto seleccionado" : "productos seleccionados"}
          </span>
        )}
      </div>
    </div>
  );
});
