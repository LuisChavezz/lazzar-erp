'use client';

import { type ColumnDef } from '@tanstack/react-table';
import type { Order } from '@/src/features/orders/interfaces/order.interface';
import {
  createOrderColumns,
  isOrderConfirmed,
  ORDER_STATUS_FILTER_FIELD,
} from '@/src/features/orders/components/SharedOrderColumns';

// Las columnas de pedidos viven en `orders/components/SharedOrderColumns.tsx`,
// compartidas con Operaciones de Almacén y Compras. Mesa de Control es el único
// módulo que pasa `onConfirmDate`, así que es el único con la acción de
// confirmar la fecha en el menú de la fila.
export { isOrderConfirmed, ORDER_STATUS_FILTER_FIELD };

// Callbacks que el componente padre inyecta para acciones del flujo.
export interface OperationsOrderColumnCallbacks {
  onConfirmDate: (order: Order) => void;
  onViewDetail: (order: Order) => void;
}

// Fábrica de columnas para la tabla de la Mesa de Control de Pedidos.
export function buildOperationsOrderColumns(
  callbacks: OperationsOrderColumnCallbacks,
): ColumnDef<Order, unknown>[] {
  return createOrderColumns(callbacks);
}
