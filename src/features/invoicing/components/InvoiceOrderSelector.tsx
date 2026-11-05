"use client";

import { ServerSearchSelectList } from "@/src/components/ServerSearchSelectList";
import { renderRadioIndicator } from "@/src/components/RadioIndicator";
import { usePedidoSearchField } from "@/src/features/orders/hooks/usePedidoSearch";
import type { PedidoListItem } from "@/src/features/orders/interfaces/order.interface";
import { PEDIDO_ESTATUS } from "@/src/features/orders/constants/pedidoStatus";

interface InvoiceOrderSelectorProps {
  /** Pedido seleccionado (`null` = ninguno): va fijo arriba aunque la búsqueda no lo traiga. */
  selectedOrder: PedidoListItem | null;
  /** Selecciona un pedido. Selección única: reemplaza cualquier anterior. */
  onSelect: (order: PedidoListItem) => void;
}

/**
 * Estatus de pedido que se facturan: de la autorización en adelante. Los
 * previos (Borrador, Por autorizar) y el cancelado quedan fuera. Viaja como
 * `?estatus=` (el backend solo filtra por INCLUSIÓN), así que un estatus nuevo
 * del backend no aparece hasta sumarlo aquí. El backend no valida el estatus
 * del pedido al facturar. Los inactivos no los devuelve el listado.
 */
const INVOICEABLE_ESTATUS = [PEDIDO_ESTATUS.AUTORIZADA, PEDIDO_ESTATUS.EN_PROCESO].join(",");

/**
 * InvoiceOrderSelector
 *
 * Lista buscable de **selección única** de pedidos a facturar (Paso 1 de
 * "Nueva Factura"). Busca en el servidor (`?q=` por folio, OC o cliente) solo
 * entre los pedidos facturables (`INVOICEABLE_ESTATUS`). NO puede saber si a
 * un pedido aún le quedan piezas por facturar: el listado no lo expone, así
 * que eso lo dice el Paso 2 con el onboarding del pedido.
 */
export function InvoiceOrderSelector({ selectedOrder, onSelect }: InvoiceOrderSelectorProps) {
  const {
    search,
    setSearch,
    isSearching,
    pedidos,
    total,
    hasResults,
    isInitialError,
    refetch,
  } = usePedidoSearchField({ estatus: INVOICEABLE_ESTATUS });

  return (
    <ServerSearchSelectList<PedidoListItem>
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Buscar pedido por folio, OC o cliente..."
      results={pedidos}
      pinned={selectedOrder ? [selectedOrder] : []}
      getKey={(order) => order.id}
      isSelected={(order) => order.id === selectedOrder?.id}
      onSelect={onSelect}
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
      hasResults={hasResults}
      isInitialError={isInitialError}
      isSearching={isSearching}
      onRetry={() => void refetch()}
      total={total}
      emptyMessage="No hay pedidos disponibles."
      noResultsMessage="No se encontraron pedidos"
      errorMessage="Error al buscar los pedidos."
    />
  );
}
