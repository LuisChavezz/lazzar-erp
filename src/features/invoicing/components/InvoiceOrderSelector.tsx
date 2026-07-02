"use client";

import { Loader } from "@/src/components/Loader";
import { CheckIcon } from "@/src/components/Icons";
import { SearchableSelectList } from "@/src/components/SearchableSelectList";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import type { Order } from "@/src/features/orders/interfaces/order.interface";

interface InvoiceOrderSelectorProps {
  /** Id del pedido seleccionado (`0` = ninguno). */
  selectedOrderId: number;
  /** Selecciona un pedido. Selección única: reemplaza cualquier anterior. */
  onSelect: (orderId: number) => void;
}

/**
 * InvoiceOrderSelector
 *
 * Lista buscable de **selección única** de pedidos a facturar. No filtra por
 * estatus de facturación: `useOrders()` no expone si un pedido ya tiene factura,
 * así que un filtro cliente sería falso — la garantía de "no facturar dos veces"
 * recae en el `400` del servidor (que el diálogo notifica vía toast). Reutiliza
 * el patrón de lista buscable de `ProductionOrderStep1`, adaptado a selección
 * única (indicador circular tipo radio en vez de casilla).
 */
export function InvoiceOrderSelector({
  selectedOrderId,
  onSelect,
}: InvoiceOrderSelectorProps) {
  const { orders, isLoading, isError } = useOrders();

  if (isLoading) {
    return (
      <Loader
        title="Cargando pedidos"
        message="Obteniendo pedidos disponibles..."
      />
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-red-500 p-4">Error al cargar los pedidos.</p>
    );
  }

  return (
    <SearchableSelectList<Order>
      items={orders}
      searchPlaceholder="Buscar pedido por folio o cliente..."
      filterPredicate={(order, term) =>
        order.folio.toLowerCase().includes(term) ||
        order.cliente_nombre.toLowerCase().includes(term)
      }
      getKey={(order) => order.id}
      isSelected={(order) => order.id === selectedOrderId}
      onSelect={(order) => onSelect(order.id)}
      emptyMessage="No hay pedidos disponibles."
      noResultsMessage="No se encontraron pedidos"
      renderIndicator={(selected) => (
        // Indicador circular tipo radio (selección única)
        <span
          className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            selected
              ? "border-sky-500 bg-sky-500 text-white"
              : "border-slate-300 dark:border-slate-600"
          }`}
        >
          {selected && <CheckIcon className="w-3.5 h-3.5" />}
        </span>
      )}
      renderContent={(order) => (
        <>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
            {order.folio}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {order.cliente_nombre}
          </p>
        </>
      )}
    />
  );
}
