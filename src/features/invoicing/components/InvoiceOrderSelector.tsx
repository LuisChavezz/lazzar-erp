"use client";

import { Loader } from "@/src/components/Loader";
import { SearchableSelectList } from "@/src/components/SearchableSelectList";
import { renderRadioIndicator } from "@/src/components/RadioIndicator";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import type { PedidoListItem } from "@/src/features/orders/interfaces/order.interface";
import { PEDIDO_ESTATUS } from "@/src/features/orders/constants/pedidoStatus";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";

interface InvoiceOrderSelectorProps {
  /** Id del pedido seleccionado (`0` = ninguno). */
  selectedOrderId: number;
  /** Selecciona un pedido. Selección única: reemplaza cualquier anterior. */
  onSelect: (orderId: number) => void;
}

/**
 * Estatus de pedido que NO se facturan: los previos a la autorización
 * (Borrador, Por autorizar) y el cancelado. Lista de EXCLUSIÓN a propósito:
 * cualquier estatus desde la autorización en adelante sigue facturable. El
 * backend no valida el estatus del pedido al facturar.
 */
const NON_INVOICEABLE_STATUSES: readonly number[] = [
  PEDIDO_ESTATUS.BORRADOR,
  PEDIDO_ESTATUS.POR_AUTORIZAR,
  PEDIDO_ESTATUS.CANCELADO,
];

const isInvoiceable = (order: PedidoListItem) =>
  order.activo && !NON_INVOICEABLE_STATUSES.includes(order.estatus);

/**
 * InvoiceOrderSelector
 *
 * Lista buscable de **selección única** de pedidos a facturar (Paso 1 de
 * "Nueva Factura"). Excluye en cliente los pedidos inactivos, los no
 * autorizados aún y los cancelados (ver `NON_INVOICEABLE_STATUSES`). NO
 * puede saber si a un pedido aún le quedan piezas por facturar: el listado no
 * lo expone, así que eso lo dice el Paso 2 con el onboarding del pedido.
 * Reutiliza el patrón de lista buscable de `ProductionOrderStep1`, adaptado a
 * selección única (indicador circular tipo radio en vez de casilla).
 */
export function InvoiceOrderSelector({
  selectedOrderId,
  onSelect,
}: InvoiceOrderSelectorProps) {
  const { orders: allOrders, isLoading, isError, hasLoaded } = useOrders();
  const orders = allOrders.filter(isInvoiceable);

  if (isLoading) {
    return (
      <Loader
        title="Cargando pedidos"
        message="Obteniendo pedidos disponibles..."
      />
    );
  }

  // Solo un error SIN datos cargados oculta la lista; un refetch fallido la
  // conserva y avisa por toast (ver `useOrders`).
  if (isInitialLoadError(isError, hasLoaded)) {
    return (
      <p className="text-sm text-red-500 p-4">Error al cargar los pedidos.</p>
    );
  }

  return (
    <SearchableSelectList<PedidoListItem>
      items={orders}
      searchPlaceholder="Buscar pedido por folio o cliente..."
      filterPredicate={(order, term) =>
        (order.folio ?? "").toLowerCase().includes(term) ||
        (order.cliente_nombre ?? "").toLowerCase().includes(term)
      }
      getKey={(order) => order.id}
      isSelected={(order) => order.id === selectedOrderId}
      onSelect={(order) => onSelect(order.id)}
      emptyMessage="No hay pedidos disponibles."
      noResultsMessage="No se encontraron pedidos"
      renderIndicator={renderRadioIndicator}
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
