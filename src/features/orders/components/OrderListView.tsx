'use client';

import { useState } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { DataTable, type DataTableVisibleColumn } from '@/src/components/DataTable';
import { Button } from '@/src/components/Button';
import { ExportCsvIcon, ExportPdfIcon } from '@/src/components/Icons';
import { usePedidoAmountsVisibility, usePedidosTable } from '../hooks/usePedidosTable';
import { usePedidoKpis } from '../hooks/usePedidoKpis';
import { useProcurementOrderCsvExport } from '../hooks/useProcurementOrderCsvExport';
import { useProcurementOrderPdfExport } from '../hooks/useProcurementOrderPdfExport';
import { MIS_PEDIDOS_TABLE_QUERY_KEY, ORDERS_QUERY_KEY } from '../constants/ordersQueryKeys';
import type { PedidoDetailOrigin } from '../constants/pedidoDetailOrigins';
import { procurementPedidosTable, salesPedidosTable } from '../utils/pedidoListParams';
import { createSalesOrderColumns } from './SalesOrderColumns';
import { createProcurementOrderColumns } from './ProcurementOrderColumns';
import type { PedidoListItem } from '../interfaces/order.interface';

interface OrderListViewProps {
  /**
   * Origen de la navegación. Viaja como `?from=` al detalle 360° para que el
   * "Volver" regrese a la lista del módulo correcto (`procurement`, `sales`).
   */
  from: PedidoDetailOrigin;
  /**
   * `"sales"` es "Mis pedidos": `?mis_pedidos=true` (solo los pedidos de
   * cotizaciones del usuario), columnas de `SalesOrderColumns.tsx` y filtros de
   * confirmación y mes. `"procurement"` es Compras › Pedidos: columnas de
   * `ProcurementOrderColumns.tsx`, filtros de estatus, cliente, meses y total,
   * y botones de exportar a Excel/PDF. Las dos son de solo lectura.
   */
  variant: 'sales' | 'procurement';
  /**
   * Llaves EXTRA que "Actualizar datos" invalida junto con la lista (p. ej. los
   * indicadores que la página monta encima), para que tarjetas y tabla no
   * muestren cifras de momentos distintos. Son llaves y no un callback porque
   * la página que monta esta vista es de servidor.
   */
  extraRefetchQueryKeys?: readonly QueryKey[];
}

/**
 * Lista de pedidos de solo lectura (`GET /ventas/pedidos/`) en MODO SERVIDOR:
 * filtros, búsqueda, orden y página los resuelve el backend y viven en la URL,
 * así que la página que la monta la envuelve en `<Suspense>`.
 */
export function OrderListView({ variant, ...props }: OrderListViewProps) {
  return variant === 'sales' ? <SalesOrderList {...props} /> : <ProcurementOrderList {...props} />;
}

type ListProps = Omit<OrderListViewProps, 'variant'>;

/** "Actualizar datos" de la tabla más las llaves extra de la página. */
const useToolbarRefetch = (
  onRefetch: (() => Promise<unknown>) | undefined,
  extraRefetchQueryKeys: readonly QueryKey[] | undefined,
) => {
  const queryClient = useQueryClient();
  return onRefetch && extraRefetchQueryKeys?.length
    ? () =>
        Promise.all([
          onRefetch(),
          ...extraRefetchQueryKeys.map((key) => queryClient.invalidateQueries({ queryKey: key })),
        ])
    : onRefetch;
};

/** Mis pedidos (`/sales/orders`). */
function SalesOrderList({ from, extraRefetchQueryKeys }: ListProps) {
  // `puede_ver_importes` sale de los indicadores de la página (`kpis/`, la
  // misma consulta y llave que `PedidoKpisSection`: no es otra petición).
  // Hasta que llegan, o si nunca cargan, la columna de importe no se monta
  // (falla cerrado) y los criterios de importe de la URL se envían tal cual.
  const puedeVerImportes = usePedidoKpis().data?.puede_ver_importes;
  const table = usePedidosTable({
    definition: salesPedidosTable,
    queryKey: MIS_PEDIDOS_TABLE_QUERY_KEY,
    misPedidos: true,
    puedeVerImportes,
    toastId: 'mis-pedidos-table-refetch-error',
  });
  const showAmounts = puedeVerImportes === true;
  const onRefetch = useToolbarRefetch(table.tableProps.onRefetch, extraRefetchQueryKeys);

  // Leyenda del punto de confirmación, integrada en la barra de herramientas
  // (vía `actionButton`) en vez de una fila propia: no depende de hover (que
  // en touch no existe) y no empuja la tabla hacia abajo.
  const confirmationLegend = (
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
  );

  return (
    <DataTable
      columns={createSalesOrderColumns({ from, showAmounts })}
      {...table.tableProps}
      onRefetch={onRefetch}
      getRowId={(row) => String(row.id)}
      // El backend busca en folio, OC y cliente; por fecha se filtra con el
      // mes del encabezado "Fecha".
      searchPlaceholder="Buscar por folio, cliente u OC..."
      actionButton={confirmationLegend}
      emptyMessage="Aún no tienes pedidos"
      errorTitle="Error al cargar pedidos"
      loadingAriaLabel="Cargando pedidos"
    />
  );
}

/** Compras › Pedidos (`/procurement/orders`). */
function ProcurementOrderList({ from, extraRefetchQueryKeys }: ListProps) {
  // Esta pantalla no tiene una consulta propia que traiga
  // `puede_ver_importes`: la pide aparte (`usePedidoAmountsVisibility`).
  // Mientras no llega, decide con las filas (el listado QUITA los importes a
  // quien no los ve).
  const puedeVerImportes = usePedidoAmountsVisibility();
  const table = usePedidosTable({
    definition: procurementPedidosTable,
    queryKey: ORDERS_QUERY_KEY,
    puedeVerImportes,
    toastId: 'procurement-pedidos-table-refetch-error',
    // EC-694/695: la vista por defecto se conserva 30 min en caché.
    cacheDefaultView: true,
  });
  const showAmounts =
    puedeVerImportes ??
    table.rows.some((row) => row.gran_total !== undefined || row.subtotal !== undefined);
  const onRefetch = useToolbarRefetch(table.tableProps.onRefetch, extraRefetchQueryKeys);

  // ── Exportar ──────────────────────────────────────────────────────────────
  // TODO lo que cumple los criterios vigentes (búsqueda, filtros y orden), no
  // solo la página visible: `exportar/` lo devuelve en una sola petición al
  // hacer clic. Las columnas son las visibles, por `onVisibleColumnsChange`.
  const [visibleColumns, setVisibleColumns] = useState<DataTableVisibleColumn<PedidoListItem>[]>(
    [],
  );
  useProcurementOrderCsvExport(table.fetchExportRows, visibleColumns);
  useProcurementOrderPdfExport(table.fetchExportRows, visibleColumns);

  // Compras es de solo lectura (sin "Nueva orden"): el único `actionButton`
  // que le hace falta es exportar. Mismo patrón visual que
  // `PurchaseOrderView` (verde = Excel, rojo = PDF).
  const exportButtons = (
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
  );

  return (
    // El cuerpo de la tabla llena su contenedor (que el `page.tsx` acota a la
    // altura del viewport) en vez de reservar un alto fijo.
    <div className="h-full flex flex-col min-h-0">
      <DataTable
        columns={createProcurementOrderColumns({ from, showAmounts })}
        {...table.tableProps}
        onRefetch={onRefetch}
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar por folio, cliente u OC..."
        actionButton={exportButtons}
        fillHeight
        onVisibleColumnsChange={setVisibleColumns}
        emptyMessage="No hay pedidos registrados"
        errorTitle="Error al cargar pedidos"
        loadingAriaLabel="Cargando pedidos"
      />
    </div>
  );
}
