"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SearchInput } from "@/src/components/SearchInput";
import { Loader } from "@/src/components/Loader";
import { CheckIcon } from "@/src/components/Icons";
import { useProducts } from "@/src/features/products/hooks/useProducts";

interface BomStep2Props {
  /** Advances to Step 3 with the selected component (product) ids. */
  onNext: (componentIds: number[]) => void;
  /** Returns to Step 1. */
  onBack: () => void;
}

/**
 * BomStep2
 *
 * Step 2 of the BOM onboarding flow. A searchable, multi-select list of
 * products (tipo_id = 2) that will become the materials of the lista. Selection
 * only — per-item configuration happens in Step 3. "Continuar" is enabled once
 * at least one product is selected.
 */
export function BomStep2({ onNext, onBack }: BomStep2Props) {
  const { products, isLoading, isError } = useProducts(2);

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.nombre.toLowerCase().includes(term) ||
        (product.descripcion ?? "").toLowerCase().includes(term),
    );
  }, [products, search]);

  const toggleProduct = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  // ── Loading state ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Loader
        title="Cargando productos"
        message="Obteniendo lista de materiales disponibles..."
      />
    );
  }

  // ── Error state ───────────────────────────────────────────────────────
  if (isError) {
    return (
      <p className="text-sm text-red-500 p-4">Error al cargar los productos.</p>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────
  if (products.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">
        No hay productos disponibles.
      </p>
    );
  }

  const selectedCount = selectedIds.length;
  const canAdvance = selectedCount > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar por nombre o descripción..."
      />

      {/* Selected count */}
      <p className="text-xs text-slate-500 font-medium">
        {selectedCount === 0
          ? "Ningún material seleccionado"
          : `${selectedCount} material${selectedCount === 1 ? "" : "es"} seleccionado${selectedCount === 1 ? "" : "s"}`}
      </p>

      {/* Scrollable multi-select list */}
      <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
        {filteredProducts.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            No se encontraron productos
          </p>
        ) : (
          filteredProducts.map((product) => {
            const selected = selectedIds.includes(product.id);
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => toggleProduct(product.id)}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-150 cursor-pointer ${
                  selected
                    ? "border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-900/20"
                    : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10"
                }`}
              >
                {/* Check indicator */}
                <span
                  className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    selected
                      ? "border-sky-500 bg-sky-500 text-white"
                      : "border-slate-300 dark:border-slate-600"
                  }`}
                >
                  {selected && <CheckIcon className="w-3.5 h-3.5" />}
                </span>

                {/* Product info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {product.nombre}
                  </p>
                  {product.descripcion && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {product.descripcion}
                    </p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

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
          onClick={() => canAdvance && onNext(selectedIds)}
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
