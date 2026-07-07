'use client';

import { useMemo, useState } from 'react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import KpiGrid, { type KpiItem } from '@/src/components/KpiGrid';
import { ErrorState } from '@/src/components/ErrorState';
import { LoadingSkeleton } from '@/src/components/LoadingSkeleton';
import {
  CheckCircleIcon,
  ClockIcon,
  ListaPreciosIcon,
  PedidosIcon,
} from '@/src/components/Icons';
import { formatCurrency, safeParseAmount } from '@/src/utils/formatCurrency';
import { useOrders } from '@/src/features/orders/hooks/useOrders';
import type { Order } from '@/src/features/orders/interfaces/order.interface';
import { isOrderConfirmed } from './OperationsOrderColumns';
import { OrderConfirmDateDialog } from './OrderConfirmDateDialog';
import { OperationsOrderTable } from './OperationsOrderTable';

// Componente principal de la Mesa de Control de Pedidos.
export function OperationsOrderPanel() {
  const { orders, isLoading, isError, error } = useOrders();
  const queryClient = useQueryClient();
  const isRefetching = useIsFetching({ queryKey: ['orders'] }) > 0;

  const [selectedOrderForDate, setSelectedOrderForDate] = useState<Order | null>(null);

  const counts = useMemo(() => {
    const confirmados = orders.filter(isOrderConfirmed).length;
    const valorTotal = orders.reduce((sum, o) => sum + safeParseAmount(o.gran_total), 0);
    return {
      total: orders.length,
      confirmados,
      porConfirmar: orders.length - confirmados,
      valorTotal,
    };
  }, [orders]);

  const kpis: KpiItem[] = useMemo(
    () => [
      {
        label: 'Total pedidos',
        value: counts.total.toString(),
        icon: PedidosIcon,
        iconBgClass: 'bg-slate-100 dark:bg-white/10',
        iconClass: 'text-slate-500',
        subLabel: 'En mesa de control',
        status: 'neutral',
        progress: 100,
      },
      {
        label: 'Por confirmar',
        value: counts.porConfirmar.toString(),
        icon: ClockIcon,
        iconBgClass: 'bg-amber-50 dark:bg-amber-500/10',
        iconClass: 'text-amber-500',
        subLabel: 'Fecha pendiente',
        status: 'neutral',
        progress: counts.total ? Math.round((counts.porConfirmar / counts.total) * 100) : 0,
      },
      {
        label: 'Confirmados',
        value: counts.confirmados.toString(),
        icon: CheckCircleIcon,
        iconBgClass: 'bg-cyan-50 dark:bg-cyan-500/10',
        iconClass: 'text-cyan-500',
        subLabel: 'Con fecha confirmada',
        status: 'positive',
        progress: counts.total ? Math.round((counts.confirmados / counts.total) * 100) : 0,
      },
      {
        label: 'Valor total',
        value: formatCurrency(counts.valorTotal),
        icon: ListaPreciosIcon,
        iconBgClass: 'bg-emerald-50 dark:bg-emerald-500/10',
        iconClass: 'text-emerald-500',
        subLabel: 'Suma de pedidos',
        status: 'positive',
        progress: 100,
      },
    ],
    [counts],
  );

  const handleRefetch = () => queryClient.invalidateQueries({ queryKey: ['orders'] });

  if (isLoading) {
    return (
      <div
        className="min-h-165"
        role="status"
        aria-live="polite"
        aria-label="Cargando pedidos"
      >
        <LoadingSkeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Error al cargar pedidos"
        message={(error as Error)?.message}
      />
    );
  }

  return (
    <div className="space-y-6">
      <KpiGrid items={kpis} />

      <OperationsOrderTable
        orders={orders}
        onConfirmDate={setSelectedOrderForDate}
        onRefetch={handleRefetch}
        isRefetching={isRefetching}
      />

      {selectedOrderForDate && (
        <OrderConfirmDateDialog
          key={`date-${selectedOrderForDate.id}`}
          open
          onOpenChange={(open) => {
            if (!open) setSelectedOrderForDate(null);
          }}
          order={selectedOrderForDate}
        />
      )}
    </div>
  );
}
