'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronRightIcon } from '@/src/components/Icons';
import { formatOrderAmountOrDash } from '../utils/orderAmountFormat';
import type { PedidoListItem } from '../interfaces/order.interface';
import { isOrderConfirmed } from '../utils/pedidoConfirmacion';
import { hasMeaningfulOc } from '../utils/pedidoFormat';
import type { PedidoDetailOrigin } from '../constants/pedidoDetailOrigins';
import { getPedidoClasificacionLabel } from '../constants/pedidoStatus';
import { PedidoFolioLink } from './PedidoFolioLink';
import { PedidoCatalogHeaderFilter, PedidoConfirmadoHeaderFilter } from './PedidoHeaderFilters';

/**
 * Columnas de "Mis pedidos" (Ventas, `GET /ventas/pedidos/`). NO reusa
 * `createOrderColumns` de `SharedOrderColumns.tsx` a propósito: este layout
 * diverge (folio con punto de confirmación en vez de columna Estado, sin
 * Fecha confirmada ni Acciones, otro orden y set de columnas) mientras que
 * Compras, WMS y Mesa de Control siguen usando la tabla compartida sin
 * cambios — ver `OrderListView` (`variant`).
 *
 * Tabla en MODO SERVIDOR (`salesPedidosTable`): el filtro de confirmación
 * (`?confirmado=`) vive en el encabezado de Folio y el de mes (`?mes=`, con
 * opciones de `opciones/?mis_pedidos=true`) en el de Fecha; `meta.serverSort`
 * es el campo de `ordering` del backend. El backend no busca en fechas: el
 * filtro de mes sustituye a la búsqueda por fecha de la tabla en memoria.
 *
 * Piezas, Vendedor y Clasificación leen `PedidoListItem` (`piezas`,
 * `vendedor_nombre`, `clasificacion`; la clasificación con la misma etiqueta
 * que el detalle, `getPedidoClasificacionLabel`) y se pueden ordenar. C.P. sigue
 * siendo PLACEHOLDER
 * a propósito, pedido explícitamente para previsualizar el layout final: su
 * celda (`PendingDataCell`) no lee ningún dato — C.P. no viene en el listado y
 * traerlo por fila con un fetch de detalle aparte (N+1) no vale la pena solo
 * por la columna. Todas llevan `meta: { hideOnMobile: true }` para no competir
 * por espacio en pantallas angostas.
 *
 * "Importe sin IVA" es `PedidoListItem.subtotal`, que el listado QUITA a
 * quien no ve importes de pedidos: sin permiso la columna no se monta.
 */
export interface SalesOrderColumnsOptions {
  /** Llave `?from=` del detalle 360° que abre el folio. */
  from: PedidoDetailOrigin;
  /** ¿El usuario ve importes de pedidos? (columna, orden por importe). */
  showAmounts: boolean;
}

function PendingDataCell() {
  return <span className="text-[13px] text-slate-300 dark:text-slate-600">—</span>;
}

export function createSalesOrderColumns({
  from,
  showAmounts,
}: SalesOrderColumnsOptions): ColumnDef<PedidoListItem, unknown>[] {
  const columns: ColumnDef<PedidoListItem, unknown>[] = [
    {
      id: 'folio',
      accessorKey: 'folio',
      meta: { label: 'Folio', serverSort: 'folio', serverFilter: 'confirmado' },
      header: ({ column }) => <PedidoConfirmadoHeaderFilter column={column} title="Folio" />,
      size: 190,
      cell: ({ row }) => {
        const order = row.original;
        const confirmed = isOrderConfirmed(order);
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                confirmed ? 'bg-cyan-500' : 'bg-amber-500'
              }`}
              role="img"
              aria-label={confirmed ? 'Confirmado' : 'Por confirmar'}
              title={confirmed ? 'Confirmado' : 'Por confirmar'}
            />
            <PedidoFolioLink
              pedidoId={order.id}
              folio={order.folio}
              from={from}
              className="group inline-flex items-center gap-1 font-mono text-[13px] font-bold text-slate-800 dark:text-white"
            >
              <ChevronRightIcon
                className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all"
                aria-hidden="true"
              />
            </PedidoFolioLink>
            {hasMeaningfulOc(order.oc) && (
              <span
                className="text-[11px] text-slate-400 dark:text-slate-500 font-mono"
                title={`Orden de compra: ${order.oc}`}
              >
                OC {order.oc}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'cliente',
      accessorKey: 'cliente_razon_social',
      header: 'Razón social',
      meta: { label: 'Razón social', serverSort: 'cliente_razon_social' },
      size: 220,
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div>
            <p
              className="text-[13px] font-medium text-slate-800 dark:text-white truncate max-w-55"
              title={order.cliente_razon_social ?? undefined}
            >
              {order.cliente_razon_social || '—'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {order.cliente_nombre || '—'}
            </p>
          </div>
        );
      },
    },
    {
      id: 'piezas',
      accessorKey: 'piezas',
      header: 'Piezas',
      size: 90,
      meta: { align: "right", label: 'Piezas', hideOnMobile: true, serverSort: 'piezas' },
      cell: ({ row }) => (
        <span className="text-[13px] tabular-nums text-slate-700 dark:text-slate-200">
          {row.original.piezas}
        </span>
      ),
    },
    {
      id: 'vendedor',
      // Vacío → `undefined` para que `sortUndefined: "last"` lo deje al final.
      accessorFn: (order) => order.vendedor_nombre || undefined,
      header: 'Vendedor',
      size: 150,
      // El backend deja los vacíos al final en ambos sentidos.
      meta: { label: 'Vendedor', hideOnMobile: true, serverSort: 'vendedor_nombre' },
      cell: ({ row }) => (
        <span className="block text-[13px] text-slate-700 dark:text-slate-200 truncate max-w-37.5">
          {row.original.vendedor_nombre || '—'}
        </span>
      ),
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      meta: { label: 'Fecha', serverSort: 'created_at', serverFilter: 'mes' },
      header: ({ column }) => (
        <PedidoCatalogHeaderFilter
          column={column}
          title="Fecha"
          catalog="mes"
          label="mes"
          misPedidos
        />
      ),
      size: 120,
      cell: ({ row }) => {
        const createdAt = row.original.created_at;
        return (
          <span className="text-[13px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {createdAt ? format(new Date(createdAt), 'd MMM yyyy', { locale: es }) : '—'}
          </span>
        );
      },
    },
    {
      id: 'clasificacion',
      // Ordena por código (A–F, X); sin clasificación, al final.
      accessorFn: (order) => order.clasificacion || undefined,
      header: 'Clasificación',
      // Etiqueta más larga: "X - Solo para facturar", igual que en Programación.
      size: 180,
      meta: { label: 'Clasificación', hideOnMobile: true, serverSort: 'clasificacion' },
      cell: ({ row }) => (
        <span className="text-[13px] text-slate-700 dark:text-slate-200 whitespace-nowrap">
          {getPedidoClasificacionLabel(row.original.clasificacion)}
        </span>
      ),
    },
    {
      id: 'codigo_postal',
      header: 'C.P.',
      size: 80,
      meta: { hideOnMobile: true },
      cell: PendingDataCell,
    },
  ];

  if (showAmounts) {
    // Antes de C.P., como siempre estuvo.
    columns.splice(columns.length - 1, 0, {
      id: 'subtotal',
      accessorKey: 'subtotal',
      header: 'Importe sin IVA',
      meta: { align: "right", label: 'Importe sin IVA', serverSort: 'subtotal' },
      size: 140,
      cell: ({ row }) => (
        <span className="tabular-nums text-[13px] font-semibold text-slate-700 dark:text-slate-200">
          {formatOrderAmountOrDash(row.original.subtotal)}
        </span>
      ),
    });
  }

  return columns;
}
