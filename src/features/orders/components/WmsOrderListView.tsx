'use client';

import { DataTable } from '@/src/components/DataTable';
import { extractErrorMessage } from '@/src/utils/extractErrorMessage';
import { useScheduledPedidos } from '@/src/features/picking/hooks/useScheduledPedidos';
import { createWmsOrderColumns } from './WmsOrderColumns';

const columns = createWmsOrderColumns();

/**
 * Pedidos de Almacén (`/wms/orders`): solo los pedidos programados por Mesa de
 * Control que se pueden surtir, del onboarding de picking. El cuerpo llena su
 * contenedor (`fillHeight`), que `wms/orders/page.tsx` acota al viewport.
 */
export function WmsOrderListView() {
  const { pedidos, isLoading, isFetching, isInitialError, error, refetch } =
    useScheduledPedidos();

  return (
    <div className="h-full flex flex-col min-h-0">
      <DataTable
        columns={columns}
        data={pedidos}
        getRowId={(pedido) => String(pedido.id)}
        searchPlaceholder="Buscar por folio, cliente o destino..."
        fillHeight
        isLoading={isLoading}
        isError={isInitialError}
        errorTitle="Error al cargar pedidos"
        errorMessage={extractErrorMessage(error, 'No se pudo cargar la información.')}
        onErrorRetry={() => void refetch()}
        loadingAriaLabel="Cargando pedidos"
        emptyMessage="No hay pedidos programados por surtir."
        onRefetch={refetch}
        isRefetching={isFetching && !isLoading}
        isLoadingOverlay={isFetching && !isLoading}
      />
    </div>
  );
}
