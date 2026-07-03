/**
 * ReceiptOrderSelector.tsx
 *
 * Paso 1 del flujo de recepción — "Seleccionar Orden".
 *
 * Decisión de diseño: el tipo de orden (Compra vs Producción) se elige con un
 * toggle DENTRO de este mismo paso, NO como un paso adicional del wizard. Así
 * "PASO 1 DE 2" y el `StepProgressBar` no cambian. Las dos listas NUNCA se
 * mezclan: el toggle decide cuál (`ordenes_compra` u `ordenes_produccion`) se
 * filtra y muestra. Compra es el valor por defecto (preserva el comportamiento
 * previo). Al cambiar de tipo se limpia la selección, ya que pertenece a la
 * otra lista.
 */

"use client";

import { useMemo, useState } from "react";
import { useReceiptOnboardingData } from "../hooks/useReceiptOnboardingData";
import { SearchInput } from "@/src/components/SearchInput";
import { Loader } from "@/src/components/Loader";
import { formatLocalDate } from "@/src/utils/formatDate";
import type {
  ReceiptOrderCandidate,
  ReceiptOrderType,
} from "../interfaces/receipt-onboarding.interface";

interface ReceiptOrderSelectorProps {
  orderType: ReceiptOrderType;
  onOrderTypeChange: (type: ReceiptOrderType) => void;
  selectedOrderId: number | null;
  onSelect: (candidate: ReceiptOrderCandidate | null) => void;
}

const ORDER_TYPE_OPTIONS: { value: ReceiptOrderType; label: string }[] = [
  { value: "compra", label: "Orden de Compra" },
  { value: "produccion", label: "Orden de Producción" },
];

export function ReceiptOrderSelector({
  orderType,
  onOrderTypeChange,
  selectedOrderId,
  onSelect,
}: ReceiptOrderSelectorProps) {
  const { onboardingData, isLoading, isError } = useReceiptOnboardingData();

  // Stabilise references so downstream useMemo doesn't recalculate every render
  const purchaseOrders = useMemo(
    () => onboardingData?.busqueda.ordenes_compra ?? [],
    [onboardingData?.busqueda.ordenes_compra],
  );
  const productionOrders = useMemo(
    () => onboardingData?.busqueda.ordenes_produccion ?? [],
    [onboardingData?.busqueda.ordenes_produccion],
  );

  const [search, setSearch] = useState("");

  const isCompra = orderType === "compra";

  // Build the display list for the ACTIVE order type: filter by search, then
  // pin the selected order at the top (even if filtered out by search).
  const displayList = useMemo<ReceiptOrderCandidate[]>(() => {
    const term = search.toLowerCase().trim();

    const candidates: ReceiptOrderCandidate[] = isCompra
      ? purchaseOrders.map((order) => ({ type: "compra", order }))
      : productionOrders.map((order) => ({ type: "produccion", order }));

    const filtered = !term
      ? candidates
      : candidates.filter((c) => {
          if (c.type === "compra") {
            return (
              (c.order.folio ?? "").toLowerCase().includes(term) ||
              (c.order.proveedor_nombre ?? "").toLowerCase().includes(term) ||
              `Proveedor #${c.order.proveedor_id}`
                .toLowerCase()
                .includes(term)
            );
          }
          return (c.order.folio ?? "").toLowerCase().includes(term);
        });

    if (selectedOrderId !== null) {
      const selected = candidates.find((c) => c.order.id === selectedOrderId);
      if (selected) {
        const withoutSelected = filtered.filter(
          (c) => c.order.id !== selectedOrderId,
        );
        return [selected, ...withoutSelected];
      }
    }

    return filtered;
  }, [isCompra, purchaseOrders, productionOrders, search, selectedOrderId]);

  const activeCount = isCompra ? purchaseOrders.length : productionOrders.length;
  const emptyLabel = isCompra
    ? "No hay órdenes de compra disponibles."
    : "No hay órdenes de producción disponibles.";
  const noResultsLabel = isCompra
    ? "No se encontraron órdenes de compra"
    : "No se encontraron órdenes de producción";

  const handleTypeChange = (next: ReceiptOrderType) => {
    if (next === orderType) return;
    onSelect(null); // La selección pertenece a la otra lista — limpiar
    setSearch("");
    onOrderTypeChange(next);
  };

  // ── Loading state (single query loads both lists) ─────────────────────────
  if (isLoading) {
    return (
      <Loader
        title="Cargando órdenes"
        message="Obteniendo lista de órdenes..."
      />
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (isError) {
    return (
      <p className="text-sm text-red-500 p-4">
        Error al cargar las órdenes.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Order-type toggle — las dos listas NO se mezclan */}
      <div className="inline-flex self-start rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden">
        {ORDER_TYPE_OPTIONS.map((opt, i) => {
          const isSelected = orderType === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleTypeChange(opt.value)}
              aria-pressed={isSelected}
              className={`px-5 py-2 text-xs font-bold tracking-wide transition-all cursor-pointer ${
                i < ORDER_TYPE_OPTIONS.length - 1
                  ? "border-r border-slate-300 dark:border-slate-600"
                  : ""
              } ${
                isSelected
                  ? "bg-sky-600 text-white shadow-inner"
                  : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Search — placeholder adaptado al tipo activo */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={
          isCompra ? "Buscar por folio o proveedor..." : "Buscar por folio..."
        }
      />

      {/* Scrollable list */}
      <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5">
        {activeCount === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            {emptyLabel}
          </p>
        ) : displayList.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            {noResultsLabel}
          </p>
        ) : (
          displayList.map((candidate) => {
            const { order } = candidate;
            const isSelected = selectedOrderId === order.id;
            const secondaryLine =
              candidate.type === "compra"
                ? candidate.order.proveedor_nombre
                : candidate.order.pedido_id !== null
                  ? `Pedido #${candidate.order.pedido_id}`
                  : `Inicio: ${formatLocalDate(candidate.order.fecha_inicio)}`;
            return (
              <button
                key={order.id}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    onSelect(null);
                  } else {
                    onSelect(candidate);
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
                    {secondaryLine}
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
