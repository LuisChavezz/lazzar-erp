'use client';

import { DataTable } from '@/src/components/DataTable';
import type { PedidoListItem } from '@/src/features/orders/interfaces/order.interface';
import {
  getScheduledOrderColumns,
  type ScheduledOrderColumnCallbacks,
} from './ScheduledOrderColumns';

interface ScheduledOrdersTableProps extends ScheduledOrderColumnCallbacks {
  orders: PedidoListItem[];
  onRefetch?: () => void | Promise<unknown>;
  isRefetching?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
}

// Tabla de "Pedidos programados" — hermana de `OperationsOrderTable`, solo lectura.
export function ScheduledOrdersTable({
  orders,
  onViewDetail,
  onRefetch,
  isRefetching,
  isLoading,
  isError,
  errorMessage,
}: ScheduledOrdersTableProps) {
  const columns = getScheduledOrderColumns({ onViewDetail });

  return (
    <DataTable
      columns={columns}
      data={orders}
      baseDataCount={orders.length}
      getRowId={(row) => String(row.id)}
      searchPlaceholder="Buscar por folio, cliente u OC..."
      emptyMessage="No hay pedidos programados."
      onRefetch={onRefetch}
      isRefetching={isRefetching}
      isLoadingOverlay={isRefetching}
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar pedidos programados"
      errorMessage={errorMessage}
      onErrorRetry={onRefetch ? () => void onRefetch() : undefined}
      loadingAriaLabel="Cargando pedidos programados"
    />
  );
}
