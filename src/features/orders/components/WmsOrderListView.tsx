'use client';

import { DataTable } from '@/src/components/DataTable';
import { extractErrorMessage } from '@/src/utils/extractErrorMessage';
import {
  SCHEDULED_PEDIDOS_LIMIT,
  useScheduledPedidos,
} from '@/src/features/picking/hooks/useScheduledPedidos';
import { createWmsOrderColumns } from './WmsOrderColumns';

const columns = createWmsOrderColumns();

/**
 * Pedidos de Almacén (`/wms/orders`): solo los pedidos programados por Mesa de
 * Control que se pueden surtir, del onboarding de picking. El cuerpo llena su
 * contenedor (`fillHeight`), que `wms/orders/page.tsx` acota al viewport.
 */
export function WmsOrderListView() {
  const { pedidos, hasLoaded, isLoading, isFetching, isInitialError, error, refetch } =
    useScheduledPedidos();

  // Sin datos cargados nunca, una petición en vuelo (el "Reintentar" tras un
  // error inicial) es CARGA, no un refresco: el cuerpo vuelve al skeleton en vez
  // de dejar el error tapado por el overlay. El overlay es solo para refrescar
  // filas ya cargadas.
  const isRetryingInitialLoad = !hasLoaded && isFetching;
  const isRefreshingLoaded = hasLoaded && isFetching;
  const mayBeTruncated = pedidos.length >= SCHEDULED_PEDIDOS_LIMIT;

  return (
    <div className="h-full flex flex-col min-h-0 gap-3">
      {mayBeTruncated && (
        <p
          role="status"
          className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
        >
          Se muestran solo los {SCHEDULED_PEDIDOS_LIMIT} pedidos programados más recientes; puede
          haber más pendientes por surtir que no aparecen en esta lista.
        </p>
      )}
      <div className="flex-1 min-h-0 flex flex-col">
        <DataTable
          columns={columns}
          data={pedidos}
          getRowId={(pedido) => String(pedido.id)}
          searchPlaceholder="Buscar por folio, cliente, destino o almacén..."
          fillHeight
          isLoading={isLoading || isRetryingInitialLoad}
          isError={isInitialError && !isRetryingInitialLoad}
          errorTitle="Error al cargar pedidos"
          errorMessage={extractErrorMessage(error, 'No se pudo cargar la información.')}
          onErrorRetry={() => void refetch()}
          loadingAriaLabel="Cargando pedidos"
          emptyMessage="No hay pedidos programados por surtir."
          onRefetch={refetch}
          isRefetching={isRefreshingLoaded}
          isLoadingOverlay={isRefreshingLoaded}
        />
      </div>
    </div>
  );
}
