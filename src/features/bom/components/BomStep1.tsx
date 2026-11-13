"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ServerSearchSelectList } from "@/src/components/ServerSearchSelectList";
import { renderCheckboxIndicator } from "@/src/components/CheckboxIndicator";
import { useProductSearchField } from "@/src/features/products/hooks/useProductSelector";
import type { ProductSelectorItem } from "@/src/features/products/interfaces/product-selector.interface";
import { PRODUCT_TYPE_IDS } from "@/src/features/product-variants/constants/variantProductTypes";

interface BomStep1Props {
  /**
   * Advances to Step 2 with the selected materials. Van los objetos completos
   * del selector (nombre, código, unidad), no solo sus ids: el Paso 2 los
   * pinta y toma su unidad sin volver a pedir el catálogo.
   */
  onNext: (materials: ProductSelectorItem[]) => void;
  /** Closes the wizard (this is the first step — no previous step). */
  onBack: () => void;
  /**
   * Selección con la que arranca el paso. Opcional: sin ella arranca vacío.
   * La usan el asistente de BOM (`BomStepManager`) y el alta de SKU de muestra
   * (`special-orders`) para conservar lo elegido al regresar desde su Paso 2;
   * solo se lee al montar.
   */
  initialSelected?: readonly ProductSelectorItem[];
}

/**
 * BomStep1
 *
 * Step 1 of the BOM onboarding flow. A searchable, multi-select list of
 * products (tipo_id = 2) that will become the materials of the lista. Selection
 * only — per-item configuration happens in Step 2. "Continuar" is enabled once
 * at least one product is selected.
 */
export function BomStep1({ onNext, onBack, initialSelected }: BomStep1Props) {
  // Búsqueda en el servidor (`producto/selector/?tipo_id=2`, EC-886): busca por
  // nombre, código y descripción, y solo trae materiales activos.
  const materialSearch = useProductSearchField({ tipo_id: PRODUCT_TYPE_IDS.MP });
  // Se guardan los OBJETOS elegidos: siguen fijos arriba aunque la búsqueda
  // actual no los traiga, y el Paso 2 los recibe tal cual.
  const [selected, setSelected] = useState<ProductSelectorItem[]>(() => [
    ...(initialSelected ?? []),
  ]);
  const isChosen = (product: ProductSelectorItem) =>
    selected.some((item) => item.id === product.id);

  const toggleProduct = (product: ProductSelectorItem) => {
    setSelected((prev) =>
      prev.some((item) => item.id === product.id)
        ? prev.filter((item) => item.id !== product.id)
        : [...prev, product],
    );
  };

  const selectedCount = selected.length;
  const canAdvance = selectedCount > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Selected count */}
      <p className="text-xs text-slate-500 font-medium">
        {selectedCount === 0
          ? "Ningún material seleccionado"
          : `${selectedCount} material${selectedCount === 1 ? "" : "es"} seleccionado${selectedCount === 1 ? "" : "s"}`}
      </p>

      {/* Search + scrollable multi-select list */}
      <ServerSearchSelectList<ProductSelectorItem>
        search={materialSearch.search}
        onSearchChange={materialSearch.setSearch}
        searchPlaceholder="Buscar por nombre, código o descripción..."
        results={materialSearch.products}
        pinned={selected}
        total={materialSearch.total}
        hasResults={materialSearch.hasResults}
        isInitialError={materialSearch.isInitialError}
        isSearching={materialSearch.isSearching}
        onRetry={() => void materialSearch.refetch()}
        getKey={(product) => product.id}
        isSelected={isChosen}
        onSelect={toggleProduct}
        emptyMessage="No hay productos disponibles."
        noResultsMessage="No se encontraron productos"
        errorMessage="Error al cargar los productos."
        maxHeightClassName="max-h-72"
        renderIndicator={renderCheckboxIndicator}
        renderContent={(product) => (
          <>
            <p className="flex items-baseline gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              <span className="truncate">{product.nombre}</span>
              {product.codigo && (
                <span className="shrink-0 text-xs font-medium tabular-nums text-slate-400">
                  {product.codigo}
                </span>
              )}
            </p>
            {product.descripcion && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {product.descripcion}
              </p>
            )}
          </>
        )}
      />

      {/* Action bar */}
      <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/10 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer bg-transparent border-none p-0"
        >
          <ArrowLeft className="h-4 w-4" />
          Regresar
        </button>

        <button
          type="button"
          disabled={!canAdvance}
          onClick={() => canAdvance && onNext(selected)}
          className={`inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition-all ${
            canAdvance
              ? "cursor-pointer hover:bg-sky-700 active:scale-[0.97]"
              : "cursor-not-allowed opacity-60"
          }`}
          aria-disabled={!canAdvance}
        >
          Continuar
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
