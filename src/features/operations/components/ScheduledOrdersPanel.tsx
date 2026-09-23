'use client';

import { useRouter } from 'next/navigation';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { extractErrorMessage } from '@/src/utils/extractErrorMessage';
import { isInitialLoadError } from '@/src/utils/isInitialLoadError';
import { ordersQueryKey, useOrders } from '@/src/features/orders/hooks/useOrders';
import type { OrdersQueryParams } from '@/src/features/orders/services/actions';
import type { PedidoListItem } from '@/src/features/orders/interfaces/order.interface';
import { ScheduledOrdersTable } from './ScheduledOrdersTable';

/**
 * Pedidos programados por Mesa de Control. `estatus=3,4` es OBLIGATORIO junto
 * con `programado=true`: sin él el backend también devuelve pedidos CANCELADOS
 * que conservan su programación. Constante de módulo para que la queryKey sea
 * estable entre renders.
 */
const SCHEDULED_ORDERS_PARAMS: OrdersQueryParams = { estatus: '3,4', programado: 'true' };

/**
 * Vista de "Pedidos programados" (solo lectura). Mismo armazón que
 * `OperationsOrderPanel`, sin KPIs: `DataTable` montada siempre, error de la
 * tabla solo en la carga inicial, y spinner/refresco acotados a SU clave exacta.
 * La programación se hace desde "Pedidos"; sus mutaciones invalidan
 * `["orders"]` por prefijo, así que esta lista se refresca sola.
 */
export function ScheduledOrdersPanel() {
  const { orders, isLoading, isError, error, hasLoaded } = useOrders(SCHEDULED_ORDERS_PARAMS);
  const queryClient = useQueryClient();
  const router = useRouter();
  const queryKey = ordersQueryKey(SCHEDULED_ORDERS_PARAMS);
  const isRefetching = useIsFetching({ queryKey, exact: true }) > 0;
  const showError = isInitialLoadError(isError, hasLoaded);

  // Detalle 360° en la ruta neutra; `?from=scheduled-orders` hace que el
  // "Volver" regrese a esta lista y no a "Pedidos".
  const handleViewDetail = (order: PedidoListItem) =>
    router.push(`/orders/${order.id}?from=scheduled-orders`);

  const handleRefetch = () => queryClient.invalidateQueries({ queryKey, exact: true });

  return (
    <ScheduledOrdersTable
      orders={orders}
      onViewDetail={handleViewDetail}
      onRefetch={handleRefetch}
      isRefetching={isRefetching}
      isLoading={isLoading}
      isError={showError}
      errorMessage={extractErrorMessage(error, 'No se pudo cargar la información.')}
    />
  );
}
