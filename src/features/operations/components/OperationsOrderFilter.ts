import type { DataTableFilterConfig } from '@/src/components/DataTable';
import type { Order } from '@/src/features/orders/interfaces/order.interface';
import { isOrderConfirmed, ORDER_STATUS_FILTER_FIELD } from './OperationsOrderColumns';

/**
 * Enriquece los pedidos con una propiedad `ORDER_STATUS_FILTER_FIELD` computada
 * para que el sistema de filtros de DataTable pueda filtrar por estado.
 */
export function enrichOrdersWithStatus(
  orders: Order[],
): (Order & { [ORDER_STATUS_FILTER_FIELD]: string })[] {
  return orders.map((order) => ({
    ...order,
    [ORDER_STATUS_FILTER_FIELD]: isOrderConfirmed(order) ? 'Confirmado' : 'Por confirmar',
  }));
}

export const operationsOrderFilterConfig: DataTableFilterConfig[] = [
  {
    id: ORDER_STATUS_FILTER_FIELD,
    label: 'Estado',
    options: [
      { value: 'Por confirmar', label: 'Por confirmar' },
      { value: 'Confirmado', label: 'Confirmado' },
    ],
  },
];
