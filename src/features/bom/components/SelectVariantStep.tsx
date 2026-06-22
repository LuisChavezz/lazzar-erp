"use client";

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { SearchInput } from "@/src/components/SearchInput";
import { Loader } from "@/src/components/Loader";
import { useProductVariants } from "@/src/features/product-variants/hooks/useProductVariants";
import type { ProductVariant } from "@/src/features/product-variants/interfaces/product-variant.interface";

interface SelectVariantStepProps {
  /** Called when the user confirms a variant and advances to the next step. */
  onNext: (variant: ProductVariant) => void;
}

/**
 * SelectVariantStep
 *
 * Step 1 of the BOM onboarding flow. Lets the user search and pick a single
 * product variant. The "Continuar" button is enabled only once a variant is
 * selected; clicking it hands the chosen variant up via `onNext`.
 *
 * `useProductVariants` exposes no server-side search param, so filtering is
 * done client-side over `nombre` and `sku`.
 */
export function SelectVariantStep({ onNext }: SelectVariantStepProps) {
  const { productVariants, isLoading, isError } = useProductVariants();

  const [search, setSearch] = useState("");
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null,
  );

  const selectedId = selectedVariant?.id ?? null;

  // Build the display list: filter by search, then pin selected variant at top
  const displayList = useMemo(() => {
    const term = search.toLowerCase().trim();

    const filtered = !term
      ? productVariants
      : productVariants.filter(
          (variant) =>
            (variant.nombre ?? "").toLowerCase().includes(term) ||
            (variant.sku ?? "").toLowerCase().includes(term),
        );

    // If a variant is selected, pin it at the top (even if filtered out)
    if (selectedId !== null) {
      const selected = productVariants.find((v) => v.id === selectedId);
      if (selected) {
        const withoutSelected = filtered.filter((v) => v.id !== selectedId);
        return [selected, ...withoutSelected];
      }
    }

    return filtered;
  }, [productVariants, search, selectedId]);

  // ── Loading state ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Loader
        title="Cargando variantes de producto"
        message="Obteniendo lista de variantes..."
      />
    );
  }

  // ── Error state ───────────────────────────────────────────────────────
  if (isError) {
    return (
      <p className="text-sm text-red-500 p-4">
        Error al cargar las variantes de producto.
      </p>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────
  if (productVariants.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">
        No hay variantes de producto disponibles.
      </p>
    );
  }

  const canAdvance = selectedVariant !== null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {/* Search */}
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre o SKU..."
        />

        {/* Scrollable list */}
        <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5">
          {displayList.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              No se encontraron variantes de producto
            </p>
          ) : (
            displayList.map((variant) => {
              const isSelected = selectedId === variant.id;
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() =>
                    setSelectedVariant(isSelected ? null : variant)
                  }
                  className={`w-full flex items-start justify-between gap-4 px-4 py-3 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-sky-50 dark:bg-sky-500/10"
                      : "bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                      {variant.nombre}
                    </span>
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400 truncate">
                      {variant.sku}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    {isSelected && (
                      <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wide">
                        Seleccionado
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-end border-t border-slate-200 dark:border-white/10 pt-4">
        <button
          type="button"
          disabled={!canAdvance}
          onClick={() => selectedVariant && onNext(selectedVariant)}
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
