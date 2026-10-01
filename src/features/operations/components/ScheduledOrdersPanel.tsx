'use client';

import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { extractErrorMessage } from '@/src/utils/extractErrorMessage';
import { isInitialLoadError } from '@/src/utils/isInitialLoadError';
import { ordersQueryKey, useOrders } from '@/src/features/orders/hooks/useOrders';
import type { OrdersQueryParams } from '@/src/features/orders/services/actions';
import { flattenScheduledParcialidades } from '../utils/scheduled-parcialidades.utils';
import { ScheduledOrdersTable } from './ScheduledOrdersTable';

/**
 * Pedidos programados por Mesa de Control. `estatus=3,4` es OBLIGATORIO junto
 * con `programado=true`: sin él el backend también devuelve pedidos CANCELADOS
 * que conservan su programación. Constante de módulo para que la queryKey sea
 * estable entre renders.
 */
const SCHEDULED_ORDERS_PARAMS: OrdersQueryParams = { estatus: '3,4', programado: 'true' };

const pluralize = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`;

/**
 * Vista de "Pedidos programados" (solo lectura), UNA fila por parcialidad. Mismo
 * armazón que `OperationsOrderPanel`, sin KPIs: `DataTable` montada siempre,
 * error de la tabla solo en la carga inicial, y spinner/refresco acotados a SU
 * clave exacta. La programación se hace desde "Pedidos"; sus mutaciones
 * invalidan `["orders"]` por prefijo, así que esta lista se refresca sola.
 *
 * El aplanado vive aquí (no en un `select` de `useOrders`) para no tocar el
 * hook ni la caché que comparte con otras vistas; React Compiler lo memoriza.
 */
export function ScheduledOrdersPanel() {
  const { orders, isLoading, isError, error, hasLoaded } = useOrders(SCHEDULED_ORDERS_PARAMS);
  const queryClient = useQueryClient();
  const queryKey = ordersQueryKey(SCHEDULED_ORDERS_PARAMS);
  const isRefetching = useIsFetching({ queryKey, exact: true }) > 0;
  const showError = isInitialLoadError(isError, hasLoaded);

  const parcialidades = flattenScheduledParcialidades(orders);
  // Totales de TODO lo cargado, no de lo filtrado: la búsqueda y los filtros
  // de la tabla solo cambian el "Mostrando a-b de N" de su pie.
  const totalPedidos = new Set(parcialidades.map((row) => row.pedidoId)).size;

  const handleRefetch = () => queryClient.invalidateQueries({ queryKey, exact: true });

  return (
    <div className="space-y-3">
      {!isLoading && !showError && (
        <p className="text-sm text-slate-500 dark:text-slate-400 tabular-nums" aria-live="polite">
          {pluralize(totalPedidos, 'pedido', 'pedidos')}
          <span className="mx-1.5 text-slate-400 dark:text-slate-500">·</span>
          {pluralize(parcialidades.length, 'parcialidad', 'parcialidades')}
        </p>
      )}
      <ScheduledOrdersTable
        parcialidades={parcialidades}
        onRefetch={handleRefetch}
        isRefetching={isRefetching}
        isLoading={isLoading}
        isError={showError}
        errorMessage={extractErrorMessage(error, 'No se pudo cargar la información.')}
      />
    </div>
  );
}
