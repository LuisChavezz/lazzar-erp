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

import { useMemo } from "react";
import { useReceiptOnboardingData } from "../hooks/useReceiptOnboardingData";
import { SearchableSelectList } from "@/src/components/SearchableSelectList";
import { SegmentedControl } from "@/src/components/SegmentedControl";
import { Loader } from "@/src/components/Loader";
import { CheckIcon } from "@/src/components/Icons";
import { formatLocalDate } from "@/src/utils/formatDate";
import type {
  ReceiptOnboardingPurchaseOrder,
  ReceiptOnboardingProductionOrder,
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

// Indicador circular tipo radio (selección única) — mismo patrón que
// InvoiceOrderSelector/ProductionOrderStep1.
function renderRadioIndicator(selected: boolean) {
  return (
    <span
      className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
        selected
          ? "border-sky-500 bg-sky-500 text-white"
          : "border-slate-300 dark:border-slate-600"
      }`}
    >
      {selected && <CheckIcon className="w-3.5 h-3.5" />}
    </span>
  );
}

export function ReceiptOrderSelector({
  orderType,
  onOrderTypeChange,
  selectedOrderId,
  onSelect,
}: ReceiptOrderSelectorProps) {
  const { onboardingData, isLoading, isError } = useReceiptOnboardingData();

  // Stabilise references so downstream reads don't recalculate every render
  const purchaseOrders = useMemo(
    () => onboardingData?.busqueda.ordenes_compra ?? [],
    [onboardingData?.busqueda.ordenes_compra],
  );
  const productionOrders = useMemo(
    () => onboardingData?.busqueda.ordenes_produccion ?? [],
    [onboardingData?.busqueda.ordenes_produccion],
  );

  const isCompra = orderType === "compra";
  const activeCount = isCompra ? purchaseOrders.length : productionOrders.length;
  const bothEmpty = purchaseOrders.length === 0 && productionOrders.length === 0;

  const handleTypeChange = (next: ReceiptOrderType) => {
    if (next === orderType) return;
    onSelect(null); // La selección pertenece a la otra lista — limpiar
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

  // ── Estado vacío total: ningún tipo de orden tiene resultados ─────────────
  if (bothEmpty) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">
        No hay órdenes disponibles para recepcionar.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Order-type toggle — las dos listas NO se mezclan */}
      <SegmentedControl
        options={ORDER_TYPE_OPTIONS}
        value={orderType}
        onChange={handleTypeChange}
        className="self-start"
      />

      {activeCount === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">
          {isCompra
            ? "No hay órdenes de compra disponibles."
            : "No hay órdenes de producción disponibles."}
        </p>
      ) : isCompra ? (
        <SearchableSelectList<ReceiptOnboardingPurchaseOrder>
          key="compra"
          items={purchaseOrders}
          searchPlaceholder="Buscar por folio o proveedor..."
          filterPredicate={(order, term) =>
            (order.folio ?? "").toLowerCase().includes(term) ||
            (order.proveedor_nombre ?? "").toLowerCase().includes(term)
          }
          getKey={(order) => order.id}
          isSelected={(order) => order.id === selectedOrderId}
          onSelect={(order) =>
            onSelect(
              selectedOrderId === order.id
                ? null
                : { type: "compra", order },
            )
          }
          emptyMessage="No hay órdenes de compra disponibles."
          noResultsMessage="No se encontraron órdenes de compra"
          renderIndicator={renderRadioIndicator}
          renderContent={(order) => (
            <>
              <p className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {order.folio}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {order.proveedor_nombre}
              </p>
            </>
          )}
        />
      ) : (
        <SearchableSelectList<ReceiptOnboardingProductionOrder>
          key="produccion"
          items={productionOrders}
          searchPlaceholder="Buscar por folio..."
          filterPredicate={(order, term) =>
            (order.folio ?? "").toLowerCase().includes(term)
          }
          getKey={(order) => order.id}
          isSelected={(order) => order.id === selectedOrderId}
          onSelect={(order) =>
            onSelect(
              selectedOrderId === order.id
                ? null
                : { type: "produccion", order },
            )
          }
          emptyMessage="No hay órdenes de producción disponibles."
          noResultsMessage="No se encontraron órdenes de producción"
          renderIndicator={renderRadioIndicator}
          renderContent={(order) => (
            <>
              <p className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {order.folio}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {order.pedido_id !== null
                  ? `Pedido #${order.pedido_id}`
                  : `Inicio: ${formatLocalDate(order.fecha_inicio)}`}
              </p>
            </>
          )}
        />
      )}
    </div>
  );
}
