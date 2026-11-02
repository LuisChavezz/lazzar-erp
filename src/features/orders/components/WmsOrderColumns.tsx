'use client';

import type { ColumnDef, FilterFn } from '@tanstack/react-table';
import { FilterHeader, type ColumnFilterOption } from '@/src/components/ColumnHeaderFilter';
import type { PickingOnboardingPedido } from '@/src/features/picking/interfaces/picking-onboarding.interface';
import { getProgramacionDestinoLabel } from '@/src/features/picking/utils/pickingDestino';
import {
  PEDIDO_PROGRAMACION_DESTINOS,
  PEDIDO_PROGRAMACION_DESTINO_LABELS,
} from '../constants/pedidoProgramacion';
import { PedidoFolioLink } from './PedidoFolioLink';

/**
 * Columnas de Pedidos de Almacén (`/wms/orders`): los pedidos por surtir del
 * onboarding de picking (`useScheduledPedidos`). Ese listado solo trae folio,
 * cliente, sucursal y programaciones, así que no hay importes, fechas ni
 * estatus. Sin columna de Acciones: el único destino de la fila es el detalle
 * 360°, que ya abre el folio.
 */

const DESTINO_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: 'Todos' },
  ...PEDIDO_PROGRAMACION_DESTINOS.map((destino) => ({
    value: destino,
    label: PEDIDO_PROGRAMACION_DESTINO_LABELS[destino],
  })),
];

// Un pedido pasa si ALGUNA de sus programaciones va al destino elegido.
const destinoFilterFn: FilterFn<PickingOnboardingPedido> = (row, _columnId, filterValue) =>
  filterValue === undefined ||
  row.original.programaciones.some((programacion) => programacion.destino === filterValue);

export function createWmsOrderColumns(): ColumnDef<PickingOnboardingPedido, unknown>[] {
  return [
    {
      id: 'folio',
      accessorKey: 'folio',
      header: 'Folio',
      cell: ({ row }) => (
        <PedidoFolioLink
          pedidoId={row.original.id}
          folio={row.original.folio}
          from="wms"
          className="font-mono text-sm font-bold text-slate-800 dark:text-white"
        />
      ),
    },
    // Los nullable se colapsan a `''` en el accessor (ver la nota de
    // `getColumnCanGlobalFilter` en `DataTable`).
    {
      id: 'cliente',
      accessorFn: (pedido) => pedido.cliente_nombre ?? '',
      header: 'Cliente',
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
      header: 'Sucursal',
      cell: ({ row }) => (
        <span className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
          {row.original.sucursal_nombre || '—'}
        </span>
      ),
    },
    {
      id: 'programaciones',
      // Texto de los destinos para que la búsqueda global los encuentre.
      accessorFn: (pedido) =>
        pedido.programaciones
          .map((programacion) => getProgramacionDestinoLabel(programacion.destino))
          .join(' '),
      header: ({ column }) => (
        <FilterHeader
          title="Programación"
          column={column}
          options={DESTINO_FILTER_OPTIONS}
          label="destino"
        />
      ),
      meta: { label: 'Programación' },
      enableSorting: false,
      filterFn: destinoFilterFn,
      cell: ({ row }) => <ProgramacionesCell pedido={row.original} />,
    },
  ];
}

function ProgramacionesCell({ pedido }: { pedido: PickingOnboardingPedido }) {
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
