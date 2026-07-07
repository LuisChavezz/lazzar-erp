'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ActionMenu, type ActionMenuItem } from '@/src/components/ActionMenu';
import { CheckCircleIcon, TasksIcon } from '@/src/components/Icons';
import { formatCurrency, safeParseAmount } from '@/src/utils/formatCurrency';
import { parseLocalDate } from '@/src/utils/formatDate';
import type { Order } from '@/src/features/orders/interfaces/order.interface';

// Identificador del estado de confirmación, compartido entre esta columna y
// el filtro de DataTable (ver OperationsOrderFilter.ts) para evitar strings
// duplicados que puedan desincronizarse.
export const ORDER_STATUS_FILTER_FIELD = 'estatus_confirmacion' as const;

// Un pedido se considera confirmado cuando ya tiene fecha de confirmación.
export function isOrderConfirmed(order: Order): boolean {
  return Boolean(order.fecha_confirmacion);
}

// Configuración visual del badge según el estado de confirmación del pedido.
function confirmationBadge(order: Order): { label: string; cls: string } {
  return isOrderConfirmed(order)
    ? {
        label: 'Confirmado',
        cls: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
      }
    : {
        label: 'Por confirmar',
        cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      };
}

// Callbacks que el componente padre inyecta para acciones del flujo.
export interface OperationsOrderColumnCallbacks {
  onConfirmDate: (order: Order) => void;
}

// Fábrica de columnas para la tabla de la Mesa de Control de Pedidos.
export function buildOperationsOrderColumns(
  callbacks: OperationsOrderColumnCallbacks,
): ColumnDef<Order, unknown>[] {
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
              {order.folio || '—'}
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
      id: 'gran_total',
      accessorKey: 'gran_total',
      header: 'Total',
      cell: ({ row }) => (
        <span className="tabular-nums text-sm font-semibold text-slate-700 dark:text-slate-200">
          {formatCurrency(safeParseAmount(row.original.gran_total))}
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
      id: 'fecha_confirmacion',
      accessorKey: 'fecha_confirmacion',
      header: 'Fecha confirmada',
      cell: ({ row }) => {
        const parsedDate = parseLocalDate(row.original.fecha_confirmacion);
        return (
          <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {parsedDate ? format(parsedDate, 'd MMM yyyy', { locale: es }) : '—'}
          </span>
        );
      },
    },
    {
      id: ORDER_STATUS_FILTER_FIELD,
      header: 'Estado',
      accessorFn: (order) => (isOrderConfirmed(order) ? 'Confirmado' : 'Por confirmar'),
      cell: ({ row }) => {
        const cfg = confirmationBadge(row.original);
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
        // Solo los pedidos sin fecha de confirmación pueden confirmarse; los ya
        // confirmados muestran un ítem deshabilitado como referencia visual.
        const actionItem: ActionMenuItem = isOrderConfirmed(order)
          ? {
              label: 'Fecha confirmada',
              icon: CheckCircleIcon,
              disabled: true,
            }
          : {
              label: 'Confirmar fecha',
              icon: TasksIcon,
              onSelect: () => callbacks.onConfirmDate(order),
            };

        return (
          <div className="flex items-center justify-center">
            <ActionMenu items={[actionItem]} ariaLabel={`Acciones del pedido ${order.folio}`} />
          </div>
        );
      },
    },
  ];
}
