'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { PedidoListItem } from '@/src/features/orders/interfaces/order.interface';
import {
  createOrderColumns,
  isOrderConfirmed,
  ORDER_STATUS_FILTER_FIELD,
} from '@/src/features/orders/components/SharedOrderColumns';

// Las columnas de pedidos viven en `orders/components/SharedOrderColumns.tsx`,
// compartidas con Operaciones de Almacén y Compras. Mesa de Control es el único
// módulo que pasa `onConfirmDate` y `onEditMesaControl`, así que es el único con
// las acciones de confirmar la fecha y editar el pedido en el menú de la fila.
export { isOrderConfirmed, ORDER_STATUS_FILTER_FIELD };

// Callbacks que el componente padre inyecta para acciones del flujo.
export interface OperationsOrderColumnCallbacks {
  onConfirmDate: (order: PedidoListItem) => void;
  onViewDetail: (order: PedidoListItem) => void;
  onEditMesaControl: (order: PedidoListItem) => void;
}

// Fábrica de columnas para la tabla de la Mesa de Control de Pedidos.
export function buildOperationsOrderColumns(
  callbacks: OperationsOrderColumnCallbacks,
): ColumnDef<PedidoListItem, unknown>[] {
  return createOrderColumns(callbacks);
}
