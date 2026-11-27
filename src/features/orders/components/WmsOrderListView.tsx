'use client';

import { useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ListTabs } from '@/src/components/ListTabs';
import { DataTable } from '@/src/components/DataTable';
import { ListExportButtons } from '@/src/components/ListExportButtons';
import { useListExport } from '@/src/hooks/useListExport';
import { SurtidoPedidoRowActionsProvider } from '@/src/features/order-fulfillment/hooks/useSurtidoPedidoRowActions';
import { SurtidoPedidoDetailDialog } from '@/src/features/order-fulfillment/components/SurtidoPedidoDetailDialog';
import type { SurtidoPedido } from '@/src/features/order-fulfillment/interfaces/order-fulfillment.interface';
import { SURTIDO_PEDIDO_EXPORT_COLUMNS } from '@/src/features/order-fulfillment/utils/surtidoPedidoExport';
import {
  parseWmsOrdersTab,
  WMS_ORDERS_DEFAULT_TAB,
  WMS_ORDERS_RESUMEN_KEY,
  WMS_ORDERS_TAB_PARAM,
  wmsOrdersFiltrosKey,
  wmsOrdersListKey,
  type WmsOrdersTab,
} from '../constants/wmsOrdersTables';
import { usePorSurtirTable, useSurtidosTable, useWmsOrdersResumen } from '../hooks/useWmsOrdersTables';
import { WMS_ORDER_EXPORT_COLUMNS } from '../utils/wmsOrderExport';
import { wmsOrderColumns } from './WmsOrderColumns';
import { wmsSurtidoColumns } from './WmsSurtidoColumns';

// La exportación de Surtidos no lleva "Salidas manuales": esta vista no la muestra.
const surtidoExportColumns = SURTIDO_PEDIDO_EXPORT_COLUMNS.filter(
  (c) => c.header !== 'Salidas manuales',
);

const pedidosSummary = (rows: readonly unknown[]) =>
  `${rows.length} pedido${rows.length === 1 ? '' : 's'}`;

/**
 * Pedidos de Almacén (`/wms/orders`, EC-993): pestañas "Por surtir" y
 * "Surtidos", las dos en MODO SERVIDOR sobre `/wms/surtido-pedidos/`.
 *
 * - La pestaña activa va en `?tab=` ("Por surtir" cuando falta) y cada tabla
 *   guarda su estado en la URL con su prefijo (`ps_`, `sd_`): por eso la página
 *   envuelve la vista en `<Suspense>`.
 * - Solo se monta la tabla de la pestaña activa, así que la lista de la otra
 *   no se pide. Los contadores salen de `resumen/` (sin filtros), que no
 *   depende de qué pestaña está montada.
 * - Todo vive bajo `["surtido-pedidos"]`: invalidar ese prefijo (mutaciones de
 *   picking, programación, retención, packing, envío…) refresca las dos
 *   pestañas y los contadores.
 *
 * El cuerpo llena su contenedor (`fillHeight`), que `wms/orders/page.tsx`
 * acota al viewport.
 */
export function WmsOrderListView() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const tab = parseWmsOrdersTab(searchParams.get(WMS_ORDERS_TAB_PARAM));
  const resumen = useWmsOrdersResumen();

  // Conserva el estado de las dos tablas (sus claves llevan prefijo): al volver
  // a una pestaña se ve como se dejó.
  const setTab = (next: WmsOrdersTab) => {
    if (next === tab) return;
    const query = new URLSearchParams(window.location.search);
    if (next === WMS_ORDERS_DEFAULT_TAB) query.delete(WMS_ORDERS_TAB_PARAM);
    else query.set(WMS_ORDERS_TAB_PARAM, next);
    const search = query.toString();
    window.history.replaceState(null, '', search ? `${pathname}?${search}` : pathname);
  };

  return (
    <div className="h-full flex flex-col min-h-0 gap-3">
      <ListTabs
        ariaLabel="Pedidos por surtido"
        value={tab}
        onChange={setTab}
        isReady={resumen.hasLoaded}
        // `resumen/` falló sin haber cargado nunca: "—" en vez de "…" eterno.
        // "Actualizar datos" de la tabla lo vuelve a pedir; las tablas no
        // dependen de él.
        isUnavailable={resumen.isInitialError}
        tabs={[
          { key: 'por-surtir', label: 'Por surtir', count: resumen.data?.por_surtir ?? 0 },
          { key: 'surtidos', label: 'Surtidos', count: resumen.data?.surtidos ?? 0 },
        ]}
      />
      {tab === 'surtidos' ? <SurtidosTab key="surtidos" /> : <PorSurtirTab key="por-surtir" />}
    </div>
  );
}

/** "Actualizar datos": la lista de la pestaña y los contadores, no la otra pestaña. */
const useRefetchTab = (tab: WmsOrdersTab) => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: wmsOrdersListKey(tab) }),
      queryClient.invalidateQueries({ queryKey: WMS_ORDERS_RESUMEN_KEY }),
      queryClient.invalidateQueries({ queryKey: wmsOrdersFiltrosKey(tab) }),
    ]);
};

function PorSurtirTab() {
  const table = usePorSurtirTable();
  const onRefetch = useRefetchTab('por-surtir');
  // Excel/PDF: TODO lo que cumple los filtros vigentes, no solo la página.
  const { exportCsv, exportPdf } = useListExport({
    getRows: table.fetchAllRows,
    columns: WMS_ORDER_EXPORT_COLUMNS,
    title: 'Pedidos por surtir',
    fileName: 'pedidos-por-surtir',
    summary: pedidosSummary,
  });

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <DataTable
        columns={wmsOrderColumns}
        {...table.tableProps}
        onRefetch={onRefetch}
        getRowId={(pedido) => String(pedido.id)}
        searchPlaceholder="Buscar por folio o cliente..."
        fillHeight
        errorTitle="Error al cargar pedidos"
        loadingAriaLabel="Cargando pedidos"
        emptyMessage="No hay pedidos programados por surtir."
        actionButton={
          <div className="flex items-center gap-2 shrink-0">
            <ListExportButtons
              subject="pedidos por surtir"
              onExcel={() => void exportCsv()}
              onPdf={() => void exportPdf()}
            />
          </div>
        }
      />
    </div>
  );
}

function SurtidosTab() {
  const table = useSurtidosTable();
  const onRefetch = useRefetchTab('surtidos');
  // Detalle por talla del pedido surtido: el diálogo vive aquí, no en la celda.
  const [detailPedido, setDetailPedido] = useState<SurtidoPedido | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { exportCsv, exportPdf } = useListExport({
    getRows: table.fetchAllRows,
    columns: surtidoExportColumns,
    title: 'Pedidos surtidos',
    fileName: 'pedidos-surtidos',
    summary: pedidosSummary,
  });

  return (
    <SurtidoPedidoRowActionsProvider
      value={{
        onViewDetail: (p) => {
          setDetailPedido(p);
          setIsDetailOpen(true);
        },
      }}
    >
      <div className="flex-1 min-h-0 flex flex-col">
        <DataTable
          columns={wmsSurtidoColumns}
          {...table.tableProps}
          onRefetch={onRefetch}
          getRowId={(p) => String(p.id)}
          searchPlaceholder="Buscar por folio o cliente..."
          fillHeight
          errorTitle="Error al cargar pedidos surtidos"
          loadingAriaLabel="Cargando pedidos surtidos"
          emptyMessage="Aún no hay pedidos surtidos por completo."
          actionButton={
            <div className="flex items-center gap-2 shrink-0">
              <ListExportButtons
                subject="pedidos surtidos"
                onExcel={() => void exportCsv()}
                onPdf={() => void exportPdf()}
              />
            </div>
          }
        />
      </div>
      <SurtidoPedidoDetailDialog pedido={detailPedido} open={isDetailOpen} onOpenChange={setIsDetailOpen} />
    </SurtidoPedidoRowActionsProvider>
  );
}
