"use client";

import { useMemo, useState } from "react";
import { SearchInput } from "@/src/components/SearchInput";
import { CheckIcon } from "@/src/components/Icons";
import { QuantitySelector } from "@/src/components/QuantitySelector";
import { PriceInput } from "@/src/components/PriceInput";
import { FormSubmitButton } from "@/src/components/FormButtons";
import type { PurchaseOrderEncabezados, PurchaseOrderOnboardingData, PurchaseOrderOnboardingResponse } from "../interfaces/purchase-order-onboarding.interface";
import { usePostPurchaseOrder } from "../hooks/usePostPurchaseOrder";
import { usePriceEntries } from "../hooks/usePriceEntries";

interface PurchaseOrderOnboardingStep2Props {
  /** Captured encabezados from Step 1. */
  step1Data: PurchaseOrderEncabezados;
  onboardingData: PurchaseOrderOnboardingData | undefined;
  /** Called after the full order POST succeeds. Receives the response. */
  onSuccess?: (response: PurchaseOrderOnboardingResponse) => void;
}

export function PurchaseOrderOnboardingStep2({
  step1Data,
  onboardingData,
  onSuccess,
}: PurchaseOrderOnboardingStep2Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const { prices, setPrice, togglePrice, priceErrors, hasPriceErrors } =
    usePriceEntries(quantities);
  const { mutateAsync: postDetalles, isPending } = usePostPurchaseOrder();

  const products = useMemo(
    () => onboardingData?.busqueda.productos ?? [],
    [onboardingData],
  );

  // ── Filter by search query ───────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.descripcion?.toLowerCase() ?? "").includes(q),
    );
  }, [products, searchQuery]);

  // ── Selection helpers ────────────────────────────────────────────────────
  const toggleProduct = (id: number) => {
    setQuantities((prev) => {
      const next = { ...prev };
      if (id in next) {
        delete next[id];
      } else {
        next[id] = 1;
      }
      return next;
    });
    togglePrice(id, () => {
      const product = products.find((p) => p.id === id);
      return (product?.precio_base ?? 0).toFixed(2);
    });
  };

  const updateQuantity = (id: number, qty: number) => {
    setQuantities((prev) => ({ ...prev, [id]: qty }));
  };

  const isSelected = (id: number) => id in quantities;
  const selectedCount = Object.keys(quantities).length;

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (selectedCount === 0 || hasPriceErrors) return;

    const detalle = Object.entries(quantities).map(([productoIdStr, cantidad]) => {
      const productoId = Number(productoIdStr);
      const product = products.find((p) => p.id === productoId);
      const precio = parseFloat(prices[productoId] ?? "").toFixed(2);
      return {
        producto: productoId,
        cantidad,
        precio,
        descripcion: product?.nombre ?? "",
      };
    });

    // Step 2 creates the Purchase Order by first posting the encabezados,
    // then posting the detalles with the returned orden_compra id.
    void postDetalles(step1Data)
      .then((createResponse) => {
        const newOrdenCompraId = createResponse.orden_compra.id;
        return postDetalles({
          orden_compra_id: newOrdenCompraId,
          detalle,
        });
      })
      .then((finalResponse) => {
        // Toast is handled by the mutation hook.
        onSuccess?.(finalResponse);
      });
    // Error toast is handled by the mutation hook.
  };

  return (
    <div className="space-y-4">
      {/* ── Search area ────────────────────────────────────────────────── */}
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Filtrar productos..."
      />

      {/* ── Selected count ─────────────────────────────────────────────── */}
      <p className="text-xs text-slate-500 font-medium">
        {selectedCount === 0
          ? "Ningún producto seleccionado"
          : `${selectedCount} producto${selectedCount === 1 ? "" : "s"} seleccionado${selectedCount === 1 ? "" : "s"}`}
      </p>

      {/* ── Product list ───────────────────────────────────────────────── */}
      <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
        {filteredProducts.map((product) => {
          const selected = isSelected(product.id);
          const qty = quantities[product.id] ?? 1;
          return (
            <div
              key={product.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-150 ${
                selected
                  ? "border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-900/20"
                  : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/5"
              }`}
            >
              {/* Clickable area: check + info */}
              <button
                type="button"
                onClick={() => toggleProduct(product.id)}
                className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer bg-transparent border-none p-0"
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

              {/* Quantity + price inputs (only when selected) */}
              {selected && (
                <div className="shrink-0 flex items-center gap-2">
                  <QuantitySelector
                    value={qty}
                    onChange={(next) => updateQuantity(product.id, next)}
                    label={`Cantidad de ${product.nombre}`}
                  />
                  <PriceInput
                    value={prices[product.id] ?? ""}
                    onChange={(next) => setPrice(product.id, next)}
                    error={priceErrors[product.id]}
                    label={`Precio de ${product.nombre}`}
                  />
                </div>
              )}

              {/* Price (read-only, before selection) */}
              {!selected && (
                <span className="shrink-0 text-xs font-bold text-slate-600 dark:text-slate-300">
                  ${Number(product.precio_base).toFixed(2)}
                </span>
              )}
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="py-10 text-center text-sm text-slate-400">
            {searchQuery
              ? "No se encontraron productos"
              : "No hay productos disponibles"}
          </div>
        )}
      </div>

      {/* ── Submit ─────────────────────────────────────────────────────── */}
      <div className="flex justify-end pt-2">
        <FormSubmitButton
          isPending={isPending}
          disabled={selectedCount === 0 || isPending || hasPriceErrors}
          onClick={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          Guardar productos
        </FormSubmitButton>
      </div>
    </div>
  );
}
