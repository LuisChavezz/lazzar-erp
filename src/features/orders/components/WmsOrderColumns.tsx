'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { FilterHeader, type ColumnFilterOption } from '@/src/components/ColumnHeaderFilter';
import { BLUE_FOLIO_LINK_CLASS } from '@/src/components/FolioButton';
import type { SurtidoPedidoPorSurtir } from '@/src/features/order-fulfillment/interfaces/order-fulfillment.interface';
import { getProgramacionDestinoLabel } from '@/src/features/picking/utils/pickingDestino';
import { ALL_FILTER_OPTION } from '@/src/utils/columnFilterOptions';
import {
  PEDIDO_PROGRAMACION_DESTINOS,
  PEDIDO_PROGRAMACION_DESTINO_LABELS,
} from '../constants/pedidoProgramacion';
import { PedidoFolioLink } from './PedidoFolioLink';
import { WmsOrdersCatalogHeader } from './WmsOrdersCatalogHeader';

/**
 * Columnas de "Por surtir" en Pedidos de Almacén (`/wms/orders`), en MODO
 * SERVIDOR (`usePorSurtirTable`, EC-993): `meta.serverSort` es el campo de
 * `ordering` (lista blanca en `porSurtirTable`) y `meta.serverFilter` la clave
 * del filtro. Mismas columnas que cuando la lista salía del onboarding: folio,
 * cliente, sucursal y programaciones. Sucursal no se ordena (el backend no la
 * acepta en `ordering`). Sin columna de Acciones: el único destino de la fila
 * es el detalle 360°, que ya abre el folio. Sin callbacks: el folio es un
 * enlace y los filtros leen sus catálogos con su propio hook.
 */

const DESTINO_FILTER_OPTIONS: ColumnFilterOption[] = [
  ALL_FILTER_OPTION,
  ...PEDIDO_PROGRAMACION_DESTINOS.map((destino) => ({
    value: destino,
    label: PEDIDO_PROGRAMACION_DESTINO_LABELS[destino],
  })),
];

export const getWmsOrderColumns = (): ColumnDef<SurtidoPedidoPorSurtir, unknown>[] => [
  {
    id: 'folio',
    accessorKey: 'folio',
    header: 'Folio',
    meta: { label: 'Folio', serverSort: 'folio' },
    cell: ({ row }) => (
      <PedidoFolioLink
        pedidoId={row.original.id}
        folio={row.original.folio}
        from="wms"
        tone="accent"
        className={BLUE_FOLIO_LINK_CLASS}
      />
    ),
  },
  {
    id: 'cliente',
    accessorFn: (pedido) => pedido.cliente_nombre ?? '',
    header: ({ column }) => (
      <WmsOrdersCatalogHeader
        column={column}
        tab="por-surtir"
        catalogo="clientes"
        title="Cliente"
        label="cliente"
        searchable
      />
    ),
    meta: { label: 'Cliente', serverSort: 'cliente_nombre', serverFilter: 'cliente' },
    cell: ({ row }) => (
      <p
        className="text-sm font-medium text-slate-800 dark:text-white truncate max-w-64"
        title={row.original.cliente_nombre ?? undefined}
      >
        {row.original.cliente_nombre || '—'}
      </p>
    ),
  },
  {
    id: 'sucursal',
    accessorFn: (pedido) => pedido.sucursal_nombre ?? '',
    header: ({ column }) => (
      <WmsOrdersCatalogHeader
        column={column}
        tab="por-surtir"
        catalogo="sucursales"
        title="Sucursal"
        label="sucursal"
      />
    ),
    meta: { label: 'Sucursal', serverFilter: 'sucursal' },
    cell: ({ row }) => (
      <span className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
        {row.original.sucursal_nombre || '—'}
      </span>
    ),
  },
  {
    id: 'programaciones',
    accessorFn: (pedido) => pedido.programaciones.length,
    header: ({ column }) => (
      <FilterHeader
        title="Programación"
        column={column}
        options={DESTINO_FILTER_OPTIONS}
        label="destino"
      />
    ),
    meta: { label: 'Programación', serverFilter: 'destino' },
    cell: ({ row }) => <ProgramacionesCell pedido={row.original} />,
  },
];

function ProgramacionesCell({ pedido }: { pedido: SurtidoPedidoPorSurtir }) {
  if (pedido.programaciones.length === 0) {
    return <span className="text-sm text-slate-400 dark:text-slate-500">Sin programación</span>;
  }

  return (
    <ul aria-label={`Programación del pedido ${pedido.folio}`} className="space-y-0.5 py-1">
      {pedido.programaciones.map((programacion, index) => {
        const comentarios = programacion.comentarios.trim();
        return (
          // Sin id propio: el orden lo fija Mesa de Control y la lista solo se lee.
          <li key={index} className="text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
            <span className="font-medium">{getProgramacionDestinoLabel(programacion.destino)}</span>
            {' · '}
            <span className="tabular-nums">{programacion.cantidad}</span> pzas →{' '}
            {programacion.almacen_sugerido ? (
              <span className="font-medium text-slate-800 dark:text-white">
                {programacion.almacen_sugerido.nombre}
              </span>
            ) : (
              <span className="italic text-slate-400 dark:text-slate-500">(sin almacén)</span>
            )}
            {/* El comentario de Mesa de Control va en tooltip para no ensanchar la fila. */}
            {comentarios ? (
              <span className="ml-1 cursor-help text-slate-400 dark:text-slate-500" title={comentarios}>
                <span aria-hidden="true">✎</span>
                <span className="sr-only">Comentario: {comentarios}</span>
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
