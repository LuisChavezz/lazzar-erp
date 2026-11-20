'use client';

import { useRef, useState } from 'react';
import { ListTabs } from '@/src/components/ListTabs';
import { surtidoPedidoColumns } from '@/src/features/order-fulfillment/components/SurtidoPedidoColumns';
import { SurtidoPedidoRowActionsProvider } from '@/src/features/order-fulfillment/hooks/useSurtidoPedidoRowActions';
import { SurtidoPedidoDetailDialog } from '@/src/features/order-fulfillment/components/SurtidoPedidoDetailDialog';
import type { SurtidoPedido } from '@/src/features/order-fulfillment/interfaces/order-fulfillment.interface';
import { useSurtidosCompletos } from '../hooks/useSurtidosCompletos';

import { DataTable, type DataTableHandle } from '@/src/components/DataTable';
import { ListExportButtons } from '@/src/components/ListExportButtons';
import { useListExport } from '@/src/hooks/useListExport';
import type { PickingOnboardingPedido } from '@/src/features/picking/interfaces/picking-onboarding.interface';
import { SURTIDO_PEDIDO_EXPORT_COLUMNS } from '@/src/features/order-fulfillment/utils/surtidoPedidoExport';
import { WMS_ORDER_EXPORT_COLUMNS } from '../utils/wmsOrderExport';
import { withHeaderFilters } from '@/src/components/withHeaderFilters';
import { extractErrorMessage } from '@/src/utils/extractErrorMessage';
import {
  SCHEDULED_PEDIDOS_LIMIT,
  useScheduledPedidos,
} from '@/src/features/picking/hooks/useScheduledPedidos';
import { createWmsOrderColumns } from './WmsOrderColumns';

const columns = createWmsOrderColumns();
// Completos: sin "Comprometidas" (siempre 0 una vez surtido).
const surtidoColumns = surtidoPedidoColumns.filter((c) => c.id !== 'comprometidas');

type Tab = 'pendientes' | 'surtidos';

/**
 * Pedidos de Almacén (`/wms/orders`): solo los pedidos programados por Mesa de
 * Control que se pueden surtir, del onboarding de picking. El cuerpo llena su
 * contenedor (`fillHeight`), que `wms/orders/page.tsx` acota al viewport.
 */
export function WmsOrderListView() {
  const { pedidos, hasLoaded, isLoading, isFetching, isInitialError, error, refetch } =
    useScheduledPedidos();
  const [tab, setTab] = useState<Tab>('pendientes');
  const done = useSurtidosCompletos();
  // Detalle por talla del pedido surtido: el diálogo vive aquí, no en la celda.
  const [detailPedido, setDetailPedido] = useState<SurtidoPedido | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Sin datos cargados nunca, una petición en vuelo (el "Reintentar" tras un
  // error inicial) es CARGA, no un refresco: el cuerpo vuelve al skeleton en vez
  // de dejar el error tapado por el overlay. El overlay es solo para refrescar
  // filas ya cargadas.
  const isRetryingInitialLoad = !hasLoaded && isFetching;
  const isRefreshingLoaded = hasLoaded && isFetching;
  const mayBeTruncated = pedidos.length >= SCHEDULED_PEDIDOS_LIMIT;

  // Excel/PDF: EXACTAMENTE las filas que deja ver la pestaña activa (filtros
  // de encabezado, búsqueda y orden).
  const pendingRef = useRef<DataTableHandle<PickingOnboardingPedido>>(null);
  const doneRef = useRef<DataTableHandle<SurtidoPedido>>(null);
  const pendingExport = useListExport({
    getRows: () => pendingRef.current?.getFilteredRows() ?? [],
    columns: WMS_ORDER_EXPORT_COLUMNS,
    title: 'Pedidos por surtir',
    fileName: 'pedidos-por-surtir',
    summary: (rows) => `${rows.length} pedido${rows.length === 1 ? '' : 's'}`,
  });
  const doneExport = useListExport({
    getRows: () => doneRef.current?.getFilteredRows() ?? [],
    columns: SURTIDO_PEDIDO_EXPORT_COLUMNS,
    title: 'Pedidos surtidos',
    fileName: 'pedidos-surtidos',
    summary: (rows) => `${rows.length} pedido${rows.length === 1 ? '' : 's'}`,
  });

  return (
    <div className="h-full flex flex-col min-h-0 gap-3">
      <ListTabs
        ariaLabel="Pedidos por surtido"
        value={tab}
        onChange={setTab}
        isReady={tab === 'pendientes' ? hasLoaded : done.hasLoaded}
        tabs={[
          { key: 'pendientes', label: 'Por surtir', count: pedidos.length },
          { key: 'surtidos', label: 'Surtidos', count: done.surtidos.length },
        ]}
      />
      {tab === 'surtidos' ? (
        <SurtidoPedidoRowActionsProvider
          value={{ onViewDetail: (p) => { setDetailPedido(p); setIsDetailOpen(true); } }}
        >
        <div className="flex-1 min-h-0 flex flex-col">
          <DataTable
            key="surtidos"
            ref={doneRef}
            columns={withHeaderFilters(surtidoColumns, done.surtidos, {
              cliente_nombre: { type: 'distinct', get: (p) => p.cliente_nombre, searchable: true, emptyOption: 'Sin cliente' },
              etapa: { type: 'distinct', get: (p) => p.etapa },
            })}
            data={done.surtidos}
            getRowId={(p) => String(p.id)}
            searchPlaceholder="Buscar por folio o cliente..."
            fillHeight
            isLoading={done.isLoading}
            isError={done.isInitialError}
            errorTitle="Error al cargar pedidos surtidos"
            errorMessage={extractErrorMessage(done.error, 'No se pudo cargar la información.')}
            onErrorRetry={() => void done.refetch()}
            loadingAriaLabel="Cargando pedidos surtidos"
            emptyMessage="Aún no hay pedidos surtidos por completo."
            onRefetch={done.refetch}
            isRefetching={done.isFetching}
            actionButton={
              <div className="flex items-center gap-2 shrink-0">
                <ListExportButtons
                  subject="pedidos surtidos"
                  onExcel={() => void doneExport.exportCsv()}
                  onPdf={() => void doneExport.exportPdf()}
                />
              </div>
            }
          />
        </div>
        <SurtidoPedidoDetailDialog pedido={detailPedido} open={isDetailOpen} onOpenChange={setIsDetailOpen} />
        </SurtidoPedidoRowActionsProvider>
      ) : (<>
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
          ref={pendingRef}
          columns={withHeaderFilters(columns, pedidos, {
            cliente: { type: 'distinct', get: (p) => p.cliente_nombre, searchable: true, emptyOption: 'Sin cliente' },
            sucursal: { type: 'distinct', get: (p) => p.sucursal_nombre },
          })}
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
          actionButton={
            <div className="flex items-center gap-2 shrink-0">
              <ListExportButtons
                subject="pedidos por surtir"
                onExcel={() => void pendingExport.exportCsv()}
                onPdf={() => void pendingExport.exportPdf()}
              />
            </div>
          }
        />
      </div>
      </>)}
    </div>
  );
}
