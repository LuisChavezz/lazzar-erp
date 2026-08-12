'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ActionMenu, type ActionMenuItem } from '@/src/components/ActionMenu';
import { CheckCircleIcon, EyeIcon, TasksIcon } from '@/src/components/Icons';
import type { DataTableFilterConfig } from '@/src/components/DataTable';
import { formatMoneyValueOrDash } from '@/src/utils/formatCurrency';
import { parseLocalDate } from '@/src/utils/formatDate';
import type { Order } from '../interfaces/order.interface';

/**
 * Definición ÚNICA de la tabla de pedidos (`GET /ventas/pedidos/`), compartida
 * por los tres módulos que la listan: Mesa de Control, Operaciones de Almacén y
 * Compras. La única diferencia entre ellos es la acción "Confirmar fecha", que
 * solo Mesa de Control expone: se activa pasando `onConfirmDate`. El resto de
 * módulos consume la tabla en modo solo lectura.
 */

// Identificador del estado de confirmación, compartido entre la columna y el
// filtro de DataTable para evitar strings duplicados que se desincronicen.
export const ORDER_STATUS_FILTER_FIELD = 'estatus_confirmacion' as const;

/** Pedido enriquecido con el estado que consume el filtro de `DataTable`. */
export type OrderWithStatus = Order & { [ORDER_STATUS_FILTER_FIELD]: string };

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

/**
 * El filtro de `DataTable` lee la propiedad cruda del objeto (`row[configId]`),
 * no el `accessorFn` de la columna, así que hay que materializar el estado en
 * los datos.
 */
export function enrichOrdersWithStatus(orders: Order[]): OrderWithStatus[] {
  return orders.map((order) => ({
    ...order,
    [ORDER_STATUS_FILTER_FIELD]: isOrderConfirmed(order) ? 'Confirmado' : 'Por confirmar',
  }));
}

export const sharedOrderFilterConfig: DataTableFilterConfig[] = [
  {
    id: ORDER_STATUS_FILTER_FIELD,
    label: 'Estado',
    options: [
      { value: 'Por confirmar', label: 'Por confirmar' },
      { value: 'Confirmado', label: 'Confirmado' },
    ],
  },
];

export interface OrderColumnsOptions {
  /** Abre el detalle 360° del pedido. Cada módulo decide su `?from=`. */
  onViewDetail: (order: Order) => void;
  /**
   * Solo Mesa de Control: al pasarlo se añade "Confirmar fecha" al menú de
   * acciones. Sin él la tabla queda de solo lectura.
   */
  onConfirmDate?: (order: Order) => void;
}

// Fábrica de columnas para cualquier lista de pedidos.
export function createOrderColumns({
  onViewDetail,
  onConfirmDate,
}: OrderColumnsOptions): ColumnDef<Order, unknown>[] {
  return [
    {
      id: 'folio',
      accessorKey: 'folio',
      header: 'Folio',
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onViewDetail(order)}
              className="font-mono text-sm font-bold text-slate-800 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors cursor-pointer"
              title="Ver detalle del pedido"
            >
              {order.folio || '—'}
            </button>
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
      id: 'gran_total',
      accessorKey: 'gran_total',
      header: 'Total',
      cell: ({ row }) => (
        <span className="tabular-nums text-sm font-semibold text-slate-700 dark:text-slate-200">
          {formatMoneyValueOrDash(row.original.gran_total)}
        </span>
      ),
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: 'Fecha',
      cell: ({ row }) => {
        const createdAt = row.original.created_at;
        return (
          <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {createdAt ? format(new Date(createdAt), 'd MMM yyyy', { locale: es }) : '—'}
          </span>
        );
      },
    },
    // `accessorFn` que colapsa `null` a `''` — mismo bug de
    // `getColumnCanGlobalFilter`/`flatRows[0]` que ya documenta
    // `CorteMangaOrderColumns.tsx`. Caso común, no teórico: los pedidos por
    // confirmar por definición no tienen `fecha_confirmacion`.
    {
      id: 'fecha_confirmacion',
      accessorFn: (order) => order.fecha_confirmacion ?? '',
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
        const items: ActionMenuItem[] = [
          {
            label: 'Ver detalle',
            icon: EyeIcon,
            onSelect: () => onViewDetail(order),
          },
        ];

        // Solo los pedidos sin fecha de confirmación pueden confirmarse; los ya
        // confirmados muestran un ítem deshabilitado como referencia visual.
        if (onConfirmDate) {
          items.push(
            isOrderConfirmed(order)
              ? {
                  label: 'Fecha confirmada',
                  icon: CheckCircleIcon,
                  disabled: true,
                }
              : {
                  label: 'Confirmar fecha',
                  icon: TasksIcon,
                  onSelect: () => onConfirmDate(order),
                },
          );
        }

        return (
          <div className="flex items-center justify-center">
            <ActionMenu items={items} ariaLabel={`Acciones del pedido ${order.folio}`} />
          </div>
        );
      },
    },
  ];
}
