import { FormInput } from "@/src/components/FormInput";
import { AddProductsSelectableItem } from "./AddProductsSelectableItem";
import type { CatalogRow } from "../hooks/useAddProductsDialog";

interface StepSelectProductProps {
  search: string;
  onSearchChange: (value: string) => void;
  rows: CatalogRow[];
  filteredRows: CatalogRow[];
  selectedRowId: number | null;
  onSelectRow: (row: CatalogRow) => void;
}

export function StepSelectProduct({
  search,
  onSearchChange,
  rows,
  filteredRows,
  selectedRowId,
  onSelectRow,
}: StepSelectProductProps) {
  return (
    <div className="space-y-4 mt-2">
      <div
        className="flex flex-col md:flex-row gap-3 md:items-center"
        role="search"
        aria-label="Buscar productos"
      >
        <div className="flex-1">
          <FormInput
            placeholder="Buscar por SKU, nombre o descripción..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label="Buscar productos"
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
          filteredRows.map((row) => (
            <AddProductsSelectableItem
              key={row.id}
              row={row}
              isSelected={selectedRowId === row.id}
              isAlreadyAdded={false}
              onToggle={onSelectRow}
            />
          ))
        )}
      </div>
    </div>
  );
}
