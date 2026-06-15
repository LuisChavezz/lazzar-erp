"use client";

import { useMemo, useState } from "react";
import { SearchInput } from "@/src/components/SearchInput";
import { CheckIcon, PlusIcon } from "@/src/components/Icons";
import { FormSubmitButton } from "@/src/components/FormButtons";
import type { PurchaseOrderEncabezados, PurchaseOrderOnboardingData, PurchaseOrderOnboardingResponse } from "../interfaces/purchase-order-onboarding.interface";
import { usePostPurchaseOrder } from "../hooks/usePostPurchaseOrder";

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
  };

  const updateQuantity = (id: number, raw: string) => {
    // Allow only positive integers
    const sanitized = raw.replace(/[^0-9]/g, "");
    const qty = sanitized === "" ? 1 : Math.max(1, parseInt(sanitized, 10) || 1);
    setQuantities((prev) => ({ ...prev, [id]: qty }));
  };

  const isSelected = (id: number) => id in quantities;
  const selectedCount = Object.keys(quantities).length;

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (selectedCount === 0) return;

    const detalle = Object.entries(quantities).map(([productoIdStr, cantidad]) => {
      const productoId = Number(productoIdStr);
      const product = products.find((p) => p.id === productoId);
      return {
        producto: productoId,
        cantidad,
        precio: product?.precio_base.toFixed(2) ?? "0.00",
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

              {/* Quantity input (only when selected) */}
              {selected && (
                <div className="shrink-0 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateQuantity(product.id, String(Math.max(1, qty - 1)))}
                    className="w-7 h-7 rounded-md border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer bg-transparent"
                    aria-label="Reducir cantidad"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M5 12h14"/></svg>
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={qty}
                    onChange={(e) => updateQuantity(product.id, e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-12 text-center text-sm font-semibold bg-transparent border border-slate-300 dark:border-slate-600 rounded-md py-1 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
                    aria-label={`Cantidad de ${product.nombre}`}
                  />
                  <button
                    type="button"
                    onClick={() => updateQuantity(product.id, String(qty + 1))}
                    className="w-7 h-7 rounded-md border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer bg-transparent"
                    aria-label="Aumentar cantidad"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Price */}
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
          disabled={selectedCount === 0 || isPending}
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
