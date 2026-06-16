"use client";

import { useMemo, useState } from "react";
import { useReceiptOnboardingData } from "../hooks/useReceiptOnboardingData";
import { SearchInput } from "@/src/components/SearchInput";
import { Loader } from "@/src/components/Loader";
import type { ReceiptOnboardingPurchaseOrder } from "../interfaces/receipt-onboarding.interface";

interface ReceiptPurchaseOrderSelectorProps {
  selectedOrderId: number | null;
  onSelect: (order: ReceiptOnboardingPurchaseOrder | null) => void;
}

export function ReceiptPurchaseOrderSelector({
  selectedOrderId,
  onSelect,
}: ReceiptPurchaseOrderSelectorProps) {
  const { onboardingData, isLoading, isError } = useReceiptOnboardingData();

  // Stabilise the reference so downstream useMemo doesn't recalculate on every render
  const purchaseOrders = useMemo(
    () => onboardingData?.busqueda.ordenes_compra ?? [],
    [onboardingData?.busqueda.ordenes_compra],
  );
  const [search, setSearch] = useState("");

  // Build the display list: filter by search, then pin selected PO at top
  const displayList = useMemo(() => {
    const term = search.toLowerCase().trim();

    // Filter all orders by search term
    const filteredOrders = !term
      ? purchaseOrders
      : purchaseOrders.filter((order) => {
          return (
            (order.folio ?? "").toLowerCase().includes(term) ||
            (order.proveedor_nombre ?? "").toLowerCase().includes(term) ||
            `Proveedor #${order.proveedor_id}`.toLowerCase().includes(term)
          );
        });

    // If a PO is selected, pin it at the top (even if filtered out by search)
    if (selectedOrderId !== null) {
      const selected = purchaseOrders.find((o) => o.id === selectedOrderId);
      if (selected) {
        const withoutSelected = filteredOrders.filter(
          (o) => o.id !== selectedOrderId
        );
        return [selected, ...withoutSelected];
      }
    }

    return filteredOrders;
  }, [purchaseOrders, search, selectedOrderId]);

  // ── Loading state ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Loader
        title="Cargando órdenes de compra"
        message="Obteniendo lista de órdenes..."
      />
    );
  }

  // ── Error state ───────────────────────────────────────────────────────
  if (isError) {
    return (
      <p className="text-sm text-red-500 p-4">
        Error al cargar las órdenes de compra.
      </p>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────
  if (purchaseOrders.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">
        No hay órdenes de compra disponibles.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar por folio o proveedor..."
      />

      {/* Scrollable list */}
      <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5">
        {displayList.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            No se encontraron órdenes de compra
          </p>
        ) : (
          displayList.map((order) => {
            const isSelected = selectedOrderId === order.id;
            return (
              <button
                key={order.id}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    onSelect(null);
                  } else {
                    onSelect(order);
                  }
                }}
                className={`w-full flex items-start justify-between gap-4 px-4 py-3 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-sky-50 dark:bg-sky-500/10"
                    : "bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-white/5"
                }`}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-mono text-sm font-semibold text-slate-800 dark:text-white truncate">
                    {order.folio}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {order.proveedor_nombre}
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
  );
}
