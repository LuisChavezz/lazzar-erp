'use client';

import { useMemo } from 'react';
import { DataTable } from '@/src/components/DataTable';
import type { Order } from '@/src/features/orders/interfaces/order.interface';
import {
  buildOperationsOrderColumns,
  type OperationsOrderColumnCallbacks,
} from './OperationsOrderColumns';
import { enrichOrdersWithStatus, operationsOrderFilterConfig } from './OperationsOrderFilter';

interface OperationsOrderTableProps extends OperationsOrderColumnCallbacks {
  orders: Order[];
  onRefetch?: () => void | Promise<unknown>;
  isRefetching?: boolean;
}

// Tabla de la Mesa de Control de Pedidos — usa DataTable con columnas dedicadas
export function OperationsOrderTable({
  orders,
  onConfirmDate,
  onRefetch,
  isRefetching,
}: OperationsOrderTableProps) {
  // `onConfirmDate` es un setter de estado estable; el useMemo evita recrear el
  // array de columnas en cada render del componente padre.
  const columns = useMemo(
    () => buildOperationsOrderColumns({ onConfirmDate }),
    [onConfirmDate],
  );

  const enrichedOrders = useMemo(() => enrichOrdersWithStatus(orders), [orders]);

  return (
    <DataTable
      columns={columns}
      data={enrichedOrders}
      baseDataCount={orders.length}
      searchPlaceholder="Buscar por folio, cliente u OC..."
      filterConfig={operationsOrderFilterConfig}
      onRefetch={onRefetch}
      isRefetching={isRefetching}
      isLoadingOverlay={isRefetching}
    />
  );
}
