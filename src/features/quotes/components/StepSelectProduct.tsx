/**
 * StepSelectProduct.tsx
 * Componente presentacional para el paso de selección de productos.
 * - Muestra el campo de búsqueda y la lista filtrada de productos virtualizada
 *   con `@tanstack/react-virtual` para manejar catálogos grandes con eficiencia.
 * - Expone la cuenta de seleccionados y toggles para servicios adicionales
 *   (bordado y reflejante).
 */
import { memo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FormInput } from "@/src/components/FormInput";
import { AddProductsSelectableItem } from "./AddProductsSelectableItem";
import type { CatalogRow } from "../types";

interface StepSelectProductProps {
  search: string;
  onSearchChange: (value: string) => void;
  rows: CatalogRow[];
  filteredRows: CatalogRow[];
  selectedRowIds: Set<number>;
  onToggleRow: (row: CatalogRow) => void;
  hasEmbroidery: boolean;
  onToggleEmbroidery: (value: boolean) => void;
  hasReflective: boolean;
  onToggleReflective: (value: boolean) => void;
  hasSleevecut: boolean;
  onToggleSleevecut: (value: boolean) => void;
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
  hasReflective,
  onToggleReflective,
  hasSleevecut,
  onToggleSleevecut,
}: StepSelectProductProps) {
  // Opt-out del React Compiler: `useVirtualizer` retorna funciones internas
  // que el compilador no puede memoizar de forma segura. `memo()` manual sigue
  // siendo el límite de optimización.
  "use no memo";

  const selectedCount = selectedRowIds.size;

  // Ref al contenedor de scroll que usa el virtualizador
  const parentRef = useRef<HTMLDivElement>(null);

  /**
   * Virtualizador de lista. Usa `measureElement` (ResizeObserver) para
   * medir alturas reales, ya que cada ítem puede o no tener descripción.
   * `gap: 8` equivale al espacio-y-2 anterior entre ítems.
   */
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: filteredRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
    gap: 8,
  });

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
        ref={parentRef}
        className="max-h-88 overflow-y-auto custom-scrollbar"
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
          /* Contenedor con altura total virtual para que el scroll sea correcto */
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <AddProductsSelectableItem
                  row={filteredRows[virtualItem.index]}
                  isSelected={selectedRowIds.has(filteredRows[virtualItem.index].id)}
                  isAlreadyAdded={false}
                  onToggle={onToggleRow}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/10">
        <div className="flex items-center gap-4 flex-wrap">
          <label
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none"
            htmlFor="select-product-bordados"
          >
            <input
              id="select-product-bordados"
              type="checkbox"
              checked={hasEmbroidery}
              onChange={(event) => onToggleEmbroidery(event.target.checked)}
              className="w-4 h-4 rounded border-slate-300"
            />
            Agregar Bordado
          </label>
          <label
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none"
            htmlFor="select-product-reflejante"
          >
            <input
              id="select-product-reflejante"
              type="checkbox"
              checked={hasReflective}
              onChange={(event) => onToggleReflective(event.target.checked)}
              className="w-4 h-4 rounded border-slate-300"
            />
            Agregar Reflejante
          </label>
          <label
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none"
            htmlFor="select-product-corte-manga"
          >
            <input
              id="select-product-corte-manga"
              type="checkbox"
              checked={hasSleevecut}
              onChange={(event) => onToggleSleevecut(event.target.checked)}
              className="w-4 h-4 rounded border-slate-300"
            />
            Corte de manga
          </label>
        </div>
        {selectedCount > 0 && (
          <span className="text-xs font-semibold text-sky-600 dark:text-sky-400" aria-live="polite">
            {selectedCount} {selectedCount === 1 ? "producto seleccionado" : "productos seleccionados"}
          </span>
        )}
      </div>
    </div>
  );
});
