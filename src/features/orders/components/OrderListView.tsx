'use client';

import { useRouter } from 'next/navigation';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/src/components/DataTable';
import { extractErrorMessage } from '@/src/utils/extractErrorMessage';
import { ordersQueryKey, useOrders } from '../hooks/useOrders';
import type { OrdersQueryParams } from '../services/actions';
import {
  createOrderColumns,
  enrichOrdersWithStatus,
  sharedOrderFilterConfig,
} from './SharedOrderColumns';
import type { PedidoListItem } from '../interfaces/order.interface';

interface OrderListViewProps {
  /**
   * Origen de la navegación. Viaja como `?from=` al detalle 360° para que el
   * "Volver" regrese a la lista del módulo correcto (`wms`, `procurement`,
   * `sales`, …).
   */
  from: string;
  /**
   * Filtros de `GET /ventas/pedidos/`. Sin params se listan todos; con
   * `{ mis_pedidos: "true" }` el backend acota a los pedidos del vendedor.
   * Cada variante cachea e invalida su propia queryKey por separado.
   */
  params?: OrdersQueryParams;
}

/**
 * Lista de pedidos compartida por los módulos que consumen `GET
 * /ventas/pedidos/` en modo solo lectura (Almacén, Compras/SCM, Ventas). Misma
 * tabla que la Mesa de Control, pero sin confirmar la fecha del pedido: eso
 * vive únicamente en Mesa de Control.
 */
export function OrderListView({ from, params }: OrderListViewProps) {
  const { orders, isLoading, isError, error } = useOrders(params);
  const queryClient = useQueryClient();
  const router = useRouter();
  // Acotamos a la queryKey de esta variante para no encender el spinner ni
  // invalidar el caché de otras vistas de pedidos (p. ej. "Mis pedidos").
  const queryKey = ordersQueryKey(params);
  const isRefetching = useIsFetching({ queryKey, exact: true }) > 0;

  // Detalle 360° del pedido en su ruta neutra; `?from` hace que el "Volver"
  // regrese a esta lista.
  const handleViewDetail = (order: PedidoListItem) =>
    router.push(`/orders/${order.id}?from=${from}`);

  const handleRefetch = () =>
    queryClient.invalidateQueries({ queryKey, exact: true });

  const columns = createOrderColumns({ onViewDetail: handleViewDetail });
  const enrichedOrders = enrichOrdersWithStatus(orders);

  return (
    <DataTable
      columns={columns}
      data={enrichedOrders}
      baseDataCount={orders.length}
      searchPlaceholder="Buscar por folio, cliente u OC..."
      filterConfig={sharedOrderFilterConfig}
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar pedidos"
      errorMessage={extractErrorMessage(error, 'No se pudo cargar la información.')}
      onErrorRetry={handleRefetch}
      loadingAriaLabel="Cargando pedidos"
      onRefetch={handleRefetch}
      isRefetching={isRefetching}
      isLoadingOverlay={isRefetching}
    />
  );
}
