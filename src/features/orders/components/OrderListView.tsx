'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import {
  DataTable,
  type DataTableHandle,
  type DataTableVisibleColumn,
} from '@/src/components/DataTable';
import { Button } from '@/src/components/Button';
import { ExportCsvIcon, ExportPdfIcon } from '@/src/components/Icons';
import { extractErrorMessage } from '@/src/utils/extractErrorMessage';
import { isInitialLoadError } from '@/src/utils/isInitialLoadError';
import { ordersQueryKey, useOrders } from '../hooks/useOrders';
import { useProcurementOrderCsvExport } from '../hooks/useProcurementOrderCsvExport';
import { useProcurementOrderPdfExport } from '../hooks/useProcurementOrderPdfExport';
import type { OrdersQueryParams } from '../services/actions';
import {
  createOrderColumns,
  enrichOrdersWithStatus,
  sharedOrderFilterConfig,
} from './SharedOrderColumns';
import { createSalesOrderColumns } from './SalesOrderColumns';
import { createProcurementOrderColumns } from './ProcurementOrderColumns';
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
  /**
   * `"sales"` activa el layout de "Mis pedidos": columnas de
   * `SalesOrderColumns.tsx` (folio con punto de confirmación, sin
   * Estado/Fecha confirmada/Acciones). `"procurement"` usa las columnas de
   * `ProcurementOrderColumns.tsx` (filtro de estatus en el propio encabezado
   * del folio) y botones de exportar a Excel/PDF — es de solo lectura, así
   * que no lleva columna de Acciones. Por defecto (`"shared"`) conserva las
   * columnas de `SharedOrderColumns.tsx` que sigue usando Almacén (y Mesa de
   * Control, en su propio consumidor fuera de este componente). El aspecto
   * (marco, buscador fijo, densidad compacta, 20 filas por página) es el
   * mismo en las tres: es el default de `DataTable`.
   */
  variant?: 'shared' | 'sales' | 'procurement';
}

/**
 * Lista de pedidos compartida por los módulos que consumen `GET
 * /ventas/pedidos/` en modo solo lectura (Almacén, Compras/SCM, Ventas), sin
 * las acciones de edición de Mesa de Control.
 */
export function OrderListView({ from, params, variant = 'shared' }: OrderListViewProps) {
  const { orders, isLoading, isError, error, hasLoaded } = useOrders(params);
  // Solo un error SIN datos cargados sustituye las filas; un refetch fallido
  // conserva la tabla y avisa por toast (ver `useOrders`).
  const showError = isInitialLoadError(isError, hasLoaded);
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

  const isSales = variant === 'sales';
  const isProcurement = variant === 'procurement';
  const isCompactVariant = isSales || isProcurement;
  const columns = isSales
    ? createSalesOrderColumns({ onViewDetail: handleViewDetail })
    : isProcurement
      ? createProcurementOrderColumns({ onViewDetail: handleViewDetail })
      : createOrderColumns({ onViewDetail: handleViewDetail });
  const enrichedOrders = enrichOrdersWithStatus(orders);

  // ── Exportar (solo `variant="procurement"`) ───────────────────────────────
  // Los hooks se montan SIEMPRE (reglas de hooks), pero solo tienen datos que
  // exportar cuando `onVisibleColumnsChange` está cableado más abajo — en
  // `shared`/`sales` quedan inertes (el botón que dispara el `CustomEvent` ni
  // siquiera se renderiza). Mismo patrón que `PurchaseOrderView`. Las filas
  // se LEEN de la tabla al hacer clic (`getFilteredRows`: filtradas y
  // ordenadas de todas las páginas), no se espejean en estado.
  const tableRef = useRef<DataTableHandle<PedidoListItem>>(null);
  const [visibleColumns, setVisibleColumns] = useState<DataTableVisibleColumn<PedidoListItem>[]>(
    [],
  );
  useProcurementOrderCsvExport(tableRef, visibleColumns);
  useProcurementOrderPdfExport(tableRef, visibleColumns);

  // Leyenda del punto de confirmación, integrada en la barra de herramientas
  // (vía `actionButton`) en vez de una fila propia: no depende de hover (que
  // en touch no existe) y no empuja la tabla hacia abajo.
  const confirmationLegend = isSales ? (
    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
        Por confirmar
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-cyan-500 shrink-0" aria-hidden="true" />
        Confirmado
      </span>
    </div>
  ) : undefined;

  // Compras es de solo lectura (sin "Nueva orden"): el único `actionButton`
  // que le hace falta es exportar. Mismo patrón visual que
  // `PurchaseOrderView` (verde = Excel, rojo = PDF).
  const exportButtons = isProcurement ? (
    <div className="flex items-center gap-2 shrink-0">
      <Button
        variant="success"
        size="icon"
        onClick={() => document.dispatchEvent(new CustomEvent('procurement-orders:exportCSV'))}
        title="Exportar a Excel (CSV)"
        aria-label="Exportar pedidos a Excel"
      >
        <ExportCsvIcon className="w-4 h-4 shrink-0" />
      </Button>
      <Button
        variant="danger"
        size="icon"
        onClick={() => document.dispatchEvent(new CustomEvent('procurement-orders:exportPDF'))}
        title="Exportar a PDF"
        aria-label="Exportar pedidos a PDF"
      >
        <ExportPdfIcon className="w-4 h-4 shrink-0" />
      </Button>
    </div>
  ) : undefined;

  const table = (
    <DataTable
      ref={tableRef}
      columns={columns}
      data={enrichedOrders}
      baseDataCount={orders.length}
      searchPlaceholder={
        isSales ? 'Filtrar resultados: folio, cliente, fecha' : 'Buscar por folio, cliente u OC...'
      }
      // En Ventas y Compras el filtro de estado vive en el propio encabezado
      // del folio (`ColumnHeaderFilter`, en `SalesOrderColumns.tsx` /
      // `ProcurementOrderColumns.tsx`) — sin `filterConfig` no se renderiza
      // el panel de chips genérico. Almacén conserva ese panel (dentro del
      // marco de la tabla).
      filterConfig={isCompactVariant ? undefined : sharedOrderFilterConfig}
      actionButton={isSales ? confirmationLegend : exportButtons}
      // Solo Compras: el cuerpo de la tabla llena su contenedor (que el
      // `page.tsx` de esa ruta acota a la altura del viewport) en vez de
      // reservar un alto fijo sin importar cuántas filas haya — evita el
      // scroll de página que molestaba en listas cortas. Ventas/Almacén NO
      // envuelven este componente en un contenedor de altura acotada, así
      // que activarlo ahí colapsaría la tabla a 0px.
      fillHeight={isProcurement}
      onVisibleColumnsChange={isProcurement ? setVisibleColumns : undefined}
      isLoading={isLoading}
      isError={showError}
      errorTitle="Error al cargar pedidos"
      errorMessage={extractErrorMessage(error, 'No se pudo cargar la información.')}
      onErrorRetry={handleRefetch}
      loadingAriaLabel="Cargando pedidos"
      onRefetch={handleRefetch}
      isRefetching={isRefetching}
      isLoadingOverlay={isRefetching}
    />
  );

  return isProcurement ? <div className="h-full flex flex-col min-h-0">{table}</div> : table;
}
