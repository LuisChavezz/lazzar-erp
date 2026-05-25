'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ActionMenu, type ActionMenuItem } from '@/src/components/ActionMenu';
import type { OrderControl, OrderControlStatus } from '../types/order-control.types';
import {
  EmbarquesIcon,
  TasksIcon,
  ViewIcon,
} from '@/src/components/Icons';

// Configuración visual de badge por estado del flujo
const controlStatusBadge: Record<
  OrderControlStatus,
  { label: string; cls: string }
> = {
  confirmado: {
    label: 'Confirmado',
    cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  },
  listo_para_liberar: {
    label: 'Listo para liberar',
    cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  },
  liberado: {
    label: 'Liberado',
    cls: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  },
};

// Callbacks que el componente padre inyecta para acciones del flujo
export interface OperationsOrderColumnCallbacks {
  onConfirmDate: (order: OrderControl) => void;
  onRelease: (order: OrderControl) => void;
}

// Fábrica de columnas para la tabla de la Mesa de Control de Pedidos
export function buildOperationsOrderColumns(
  callbacks: OperationsOrderColumnCallbacks,
): ColumnDef<OrderControl, unknown>[] {
  return [
    {
      id: 'folio',
      accessorKey: 'folio',
      header: 'Folio',
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-slate-800 dark:text-white">
              {order.folio}
            </span>
            {order.oc && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 font-mono">
                {order.oc}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'cliente',
      accessorKey: 'cliente_razon_social',
      header: 'Cliente',
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div>
            <p
              className="text-sm font-medium text-slate-800 dark:text-white truncate max-w-55"
              title={order.cliente_razon_social}
            >
              {order.cliente_razon_social}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {order.cliente_nombre}
            </p>
          </div>
        );
      },
    },
    {
      id: 'piezas',
      accessorKey: 'piezas',
      header: 'Piezas',
      cell: ({ row }) => (
        <span className="tabular-nums text-sm font-semibold text-slate-700 dark:text-slate-200">
          {row.original.piezas.toLocaleString('es-MX')}
        </span>
      ),
    },
    {
      id: 'productos',
      header: 'Productos',
      accessorFn: (row) => row.items.length,
      cell: ({ row }) => (
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {row.original.items.length}
        </span>
      ),
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: 'Fecha',
      cell: ({ row }) => (
        <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {format(new Date(row.original.created_at), 'd MMM yyyy', { locale: es })}
        </span>
      ),
    },
    {
      id: 'controlStatus',
      accessorKey: 'controlStatus',
      header: 'Estado',
      cell: ({ row }) => {
        const cfg = controlStatusBadge[row.original.controlStatus];
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.cls}`}
          >
            {cfg.label}
          </span>
        );
      },
    },
    {
      id: 'acciones',
      header: 'Acciones',
      cell: ({ row }) => {
        const order = row.original;
        const actionItem: ActionMenuItem =
          order.controlStatus === 'liberado'
            ? {
                label: 'Enviado a Programación y Embarques',
                icon: EmbarquesIcon,
                disabled: true,
              }
            : order.controlStatus === 'listo_para_liberar'
              ? {
                  label: 'Liberar',
                  icon: EmbarquesIcon,
                  onSelect: () => callbacks.onRelease(order),
                }
              : {
                  label: 'Confirmar fecha',
                  icon: TasksIcon,
                  onSelect: () => callbacks.onConfirmDate(order),
                };

        const items: ActionMenuItem[] = [
          {
            label: 'Ver detalles',
            icon: ViewIcon,
          },
          actionItem,
        ];

        return (
          <div className="flex items-center justify-center">
            <ActionMenu items={items} ariaLabel={`Acciones del pedido ${order.folio}`} />
          </div>
        );
      },
    },
  ];
}
