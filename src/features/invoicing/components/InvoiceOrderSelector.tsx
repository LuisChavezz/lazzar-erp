"use client";

import { PedidoServerSelectList } from "@/src/features/orders/components/PedidoServerSelectList";
import type { PedidoListItem } from "@/src/features/orders/interfaces/order.interface";
import { INVOICEABLE_PEDIDO_ESTATUS } from "../constants/invoiceablePedidos";

interface InvoiceOrderSelectorProps {
  /** Pedido seleccionado (`null` = ninguno): va fijo arriba aunque la búsqueda no lo traiga. */
  selectedOrder: PedidoListItem | null;
  /** Selecciona un pedido. Selección única: reemplaza cualquier anterior. */
  onSelect: (order: PedidoListItem) => void;
}

const INVOICE_PEDIDO_FILTERS = { estatus: INVOICEABLE_PEDIDO_ESTATUS };

/**
 * InvoiceOrderSelector
 *
 * Lista buscable de **selección única** de pedidos a facturar (Paso 1 de
 * "Nueva Factura"). Busca en el servidor (`?q=` por folio, OC o cliente) solo
 * entre los pedidos facturables (`INVOICEABLE_PEDIDO_ESTATUS`). NO puede saber si a
 * un pedido aún le quedan piezas por facturar: el listado no lo expone, así
 * que eso lo dice el Paso 2 con el onboarding del pedido.
 */
export function InvoiceOrderSelector({ selectedOrder, onSelect }: InvoiceOrderSelectorProps) {
  return (
    <PedidoServerSelectList
      filters={INVOICE_PEDIDO_FILTERS}
      selected={selectedOrder}
      onSelect={onSelect}
      searchPlaceholder="Buscar pedido por folio, OC o cliente..."
      emptyMessage="No hay pedidos disponibles."
    />
  );
}
