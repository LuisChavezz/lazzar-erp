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
import { SearchableSelectList } from "@/src/components/SearchableSelectList";
import { SegmentedControl } from "@/src/components/SegmentedControl";
import { Loader } from "@/src/components/Loader";
import { renderRadioIndicator } from "@/src/components/RadioIndicator";
import { formatLocalDate } from "@/src/utils/formatDate";
import {
  TIPO_COMPRA_OPTIONS,
  tipoCompraLabel,
  type TipoCompra,
} from "@/src/features/purchase-orders/constants/purchaseOrderTipoCompra";
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

// Filtro de tipo de compra de la pestaña Compra: "todos" o un `TipoCompra`.
// Se filtra en memoria sobre `busqueda.ordenes_compra` (sin `?tipo_compra=`),
// así que cambiarlo no dispara ninguna consulta.
type PurchaseTypeFilter = TipoCompra | "todos";

const PURCHASE_TYPE_FILTER_OPTIONS: { value: PurchaseTypeFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  ...TIPO_COMPRA_OPTIONS,
];

export function ReceiptOrderSelector({
  orderType,
  onOrderTypeChange,
  selectedOrderId,
  onSelect,
}: ReceiptOrderSelectorProps) {
  const { onboardingData, isLoading, isError } = useReceiptOnboardingData();
  const [purchaseTypeFilter, setPurchaseTypeFilter] = useState<PurchaseTypeFilter>("todos");

  // Stabilise references so downstream reads don't recalculate every render
  const purchaseOrders = useMemo(
    () => onboardingData?.busqueda.ordenes_compra ?? [],
    [onboardingData?.busqueda.ordenes_compra],
  );
  const productionOrders = useMemo(
    () => onboardingData?.busqueda.ordenes_produccion ?? [],
    [onboardingData?.busqueda.ordenes_produccion],
  );

  const filteredPurchaseOrders =
    purchaseTypeFilter === "todos"
      ? purchaseOrders
      : purchaseOrders.filter((order) => order.tipo_compra === purchaseTypeFilter);

  const isCompra = orderType === "compra";
  const activeCount = isCompra ? purchaseOrders.length : productionOrders.length;
  const bothEmpty = purchaseOrders.length === 0 && productionOrders.length === 0;

  const handleTypeChange = (next: ReceiptOrderType) => {
    if (next === orderType) return;
    onSelect(null); // La selección pertenece a la otra lista — limpiar
    onOrderTypeChange(next);
  };

  // Mismo mecanismo que el toggle de tipo de orden: la selección podría
  // quedar fuera de la lista filtrada (`SearchableSelectList` no la fija
  // arriba, issue #262), así que se limpia antes de cambiar el filtro.
  const handlePurchaseTypeFilterChange = (next: PurchaseTypeFilter) => {
    if (next === purchaseTypeFilter) return;
    onSelect(null);
    setPurchaseTypeFilter(next);
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

      {/* Altura mínima fija del área de la lista: así filtrar por tipo o
          cambiar Compra/Producción no encoge el diálogo, que al estar
          centrado se recolocaría y movería los controles bajo el cursor. */}
      <div className="flex flex-col gap-3 min-h-[25rem] sm:min-h-[21.5rem]">
        {activeCount === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            {isCompra
              ? "No hay órdenes de compra disponibles."
              : "No hay órdenes de producción disponibles."}
          </p>
        ) : isCompra ? (
          <>
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Tipo de compra
              </span>
              {/* En pantalla angosta ocupa todo el ancho y reparte el espacio
                  entre las tres opciones (con menos padding) para no desbordar
                  el diálogo; desde `sm` recupera el aspecto del toggle. */}
              <SegmentedControl
                options={PURCHASE_TYPE_FILTER_OPTIONS}
                value={purchaseTypeFilter}
                onChange={handlePurchaseTypeFilterChange}
                className="w-full sm:w-auto [&>button]:flex-1 [&>button]:px-2 sm:[&>button]:flex-none sm:[&>button]:px-5"
              />
            </div>
            <SearchableSelectList<ReceiptOnboardingPurchaseOrder>
              key="compra"
              items={filteredPurchaseOrders}
              searchPlaceholder="Buscar por folio, proveedor o tipo..."
              filterPredicate={(order, term) =>
                (order.folio ?? "").toLowerCase().includes(term) ||
                (order.proveedor_nombre ?? "").toLowerCase().includes(term) ||
                tipoCompraLabel(order.tipo_compra).toLowerCase().includes(term)
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
              emptyMessage="No hay órdenes de compra de este tipo."
              noResultsMessage="No se encontraron órdenes de compra"
              renderIndicator={renderRadioIndicator}
              renderContent={(order) => (
                <>
                  <p className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {order.folio ?? "Sin folio"}
                  </p>
                  {/* `flex-wrap` y no `shrink-0` en el tipo: así, en pantalla
                      angosta, el tipo baja de renglón en vez de imponer su
                      ancho completo a la fila (y ensanchar el diálogo). */}
                  <p className="flex flex-wrap min-w-0 gap-x-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="truncate max-w-full">{order.proveedor_nombre}</span>
                    <span className="whitespace-nowrap">· {tipoCompraLabel(order.tipo_compra)}</span>
                  </p>
                </>
              )}
            />
          </>
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
    </div>
  );
}
