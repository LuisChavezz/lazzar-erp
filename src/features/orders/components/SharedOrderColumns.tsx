'use client';

import type { DataTableFilterConfig } from '@/src/components/DataTable';
import type { PedidoListItem } from '../interfaces/order.interface';
import { isOrderConfirmed } from '../utils/pedidoConfirmacion';

/**
 * Helpers del estado de confirmación de un pedido (`GET /ventas/pedidos/`),
 * compartidos por las listas de Ventas (`SalesOrderColumns.tsx`) y de Pedidos
 * especiales (`specialOrderFilters.ts`). La lista de Almacén ya no lee
 * `/ventas/pedidos/` (ver `WmsOrderColumns.tsx`).
 */

// Identificador del estado de confirmación, compartido entre la columna y el
// filtro de DataTable para evitar strings duplicados que se desincronicen.
export const ORDER_STATUS_FILTER_FIELD = 'estatus_confirmacion' as const;

/** Pedido enriquecido con el estado que consume el filtro de `DataTable`. */
export type OrderWithStatus = PedidoListItem & { [ORDER_STATUS_FILTER_FIELD]: string };

/**
 * El filtro de `DataTable` lee la propiedad cruda del objeto (`row[configId]`),
 * no el `accessorFn` de la columna, así que hay que materializar el estado en
 * los datos.
 */
export function enrichOrdersWithStatus(orders: PedidoListItem[]): OrderWithStatus[] {
  return orders.map((order) => ({
    ...order,
    [ORDER_STATUS_FILTER_FIELD]: isOrderConfirmed(order) ? 'Confirmado' : 'Por confirmar',
  }));
}

export const sharedOrderFilterConfig: DataTableFilterConfig[] = [
  {
    id: ORDER_STATUS_FILTER_FIELD,
    label: 'Estado',
    options: [
      { value: 'Por confirmar', label: 'Por confirmar' },
      { value: 'Confirmado', label: 'Confirmado' },
    ],
  },
];
