'use client';

import { useRouter } from 'next/navigation';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/src/components/DataTable';
import { ErrorState } from '@/src/components/ErrorState';
import { LoadingSkeleton } from '@/src/components/LoadingSkeleton';
import { useOrders } from '../hooks/useOrders';
import {
  createOrderColumns,
  enrichOrdersWithStatus,
  sharedOrderFilterConfig,
} from './SharedOrderColumns';
import type { Order } from '../interfaces/order.interface';

/**
 * Lista de pedidos para Compras y SCM — misma tabla que la Mesa de Control
 * (`GET /ventas/pedidos/`, hook `useOrders` compartido), pero de solo lectura:
 * desde compras no se confirma la fecha del pedido.
 */
export function ProcurementOrderList() {
  const { orders, isLoading, isError, error } = useOrders();
  const queryClient = useQueryClient();
  const router = useRouter();
  const isRefetching = useIsFetching({ queryKey: ['orders'] }) > 0;

  // Detalle 360° del pedido en su ruta neutra; `?from=procurement` hace que el
  // "Volver" regrese a esta lista.
  const handleViewDetail = (order: Order) =>
    router.push(`/orders/${order.id}?from=procurement`);

  const handleRefetch = () => queryClient.invalidateQueries({ queryKey: ['orders'] });

  if (isLoading) {
    return (
      <div
        className="min-h-165"
        role="status"
        aria-live="polite"
        aria-label="Cargando pedidos"
      >
        <LoadingSkeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Error al cargar pedidos"
        message={(error as Error)?.message}
      />
    );
  }

  const columns = createOrderColumns({ onViewDetail: handleViewDetail });
  const enrichedOrders = enrichOrdersWithStatus(orders);

  return (
    <DataTable
      columns={columns}
      data={enrichedOrders}
      baseDataCount={orders.length}
      searchPlaceholder="Buscar por folio, cliente u OC..."
      filterConfig={sharedOrderFilterConfig}
      onRefetch={handleRefetch}
      isRefetching={isRefetching}
      isLoadingOverlay={isRefetching}
    />
  );
}
