'use client';

import { useRouter } from 'next/navigation';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/src/components/DataTable';
import { ErrorState } from '@/src/components/ErrorState';
import { LoadingSkeleton } from '@/src/components/LoadingSkeleton';
import { ordersQueryKey, useOrders } from '../hooks/useOrders';
import type { OrdersQueryParams } from '../services/actions';
import {
  createOrderColumns,
  enrichOrdersWithStatus,
  sharedOrderFilterConfig,
} from './SharedOrderColumns';
import type { Order } from '../interfaces/order.interface';

// El backend acota la lista a los pedidos cuya cotización de origen creó el
// usuario autenticado; los pedidos sin cotización quedan fuera.
const MIS_PEDIDOS_PARAMS: OrdersQueryParams = { mis_pedidos: 'true' };

/**
 * Lista de "Mis pedidos" para CRM y Ventas — misma tabla que el resto de los
 * módulos, pero filtrada por vendedor (`GET /ventas/pedidos/?mis_pedidos=true`)
 * y de solo lectura: la fecha del pedido se confirma desde Mesa de Control.
 */
export function SalesOrderList() {
  const { orders, isLoading, isError, error } = useOrders(MIS_PEDIDOS_PARAMS);
  const queryClient = useQueryClient();
  const router = useRouter();
  const queryKey = ordersQueryKey(MIS_PEDIDOS_PARAMS);
  const isRefetching = useIsFetching({ queryKey }) > 0;

  // Detalle 360° del pedido en su ruta neutra; `?from=sales` hace que el
  // "Volver" regrese a esta lista.
  const handleViewDetail = (order: Order) => router.push(`/orders/${order.id}?from=sales`);

  const handleRefetch = () => queryClient.invalidateQueries({ queryKey });

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
