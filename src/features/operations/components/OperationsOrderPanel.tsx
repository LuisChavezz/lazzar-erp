'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import KpiGrid, { type KpiItem } from '@/src/components/KpiGrid';
import {
  CheckCircleIcon,
  ClockIcon,
  ListaPreciosIcon,
  PedidosIcon,
} from '@/src/components/Icons';
import { extractErrorMessage } from '@/src/utils/extractErrorMessage';
import { isInitialLoadError } from '@/src/utils/isInitialLoadError';
import { formatCurrency, safeParseAmount } from '@/src/utils/formatCurrency';
import { ordersQueryKey, useOrders } from '@/src/features/orders/hooks/useOrders';
import type { PedidoListItem } from '@/src/features/orders/interfaces/order.interface';
import { isOrderConfirmed } from './OperationsOrderColumns';
import { PedidoProgramacionDialog } from '@/src/features/orders/components/PedidoProgramacionDialog';
import { OperationsOrderTable } from './OperationsOrderTable';

// Componente principal de la Mesa de Control de Pedidos.
export function OperationsOrderPanel() {
  const { orders, isLoading, isError, error, hasLoaded } = useOrders();
  // Solo un error SIN datos cargados sustituye las filas; un refetch fallido
  // conserva tabla y KPIs y avisa por toast (ver `useOrders`).
  const showError = isInitialLoadError(isError, hasLoaded);
  const queryClient = useQueryClient();
  const router = useRouter();
  // `exact`: solo la clave SIN params de este panel. Las variantes con filtros
  // (`["orders", params]`, p. ej. "Mis pedidos") comparten el prefijo y, sin
  // esto, encenderían el spinner de esta tabla. Mismo criterio que `OrderListView`.
  const isRefetching = useIsFetching({ queryKey: ordersQueryKey(), exact: true }) > 0;

  // El estado del diálogo vive aquí, no en la celda, para que sobreviva si el
  // renglón sale de la vista filtrada.
  const [selectedOrderForSchedule, setSelectedOrderForSchedule] =
    useState<PedidoListItem | null>(null);

  // Navega al detalle 360° del pedido (ruta neutra); `?from=operations` para
  // que el "Volver" regrese a esta Mesa de Control.
  const handleViewDetail = (order: PedidoListItem) =>
    router.push(`/orders/${order.id}?from=operations`);

  // Edición del pedido con sincronización a su cotización de origen. La acción
  // solo la ve quien tiene `E-MESACONTROL-PEDIDOS` (lo filtra `ActionMenu`).
  const handleEditMesaControl = (order: PedidoListItem) =>
    router.push(`/orders/${order.id}/edit-mesa-control`);

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

  // Solo la clave de este panel: las variantes con filtros no se marcan stale.
  const handleRefetch = () =>
    queryClient.invalidateQueries({ queryKey: ordersQueryKey(), exact: true });

  return (
    // Altura NATURAL a propósito (sin `fillHeight`/calc de viewport): con las
    // 4 tarjetas KPI arriba, forzar la tabla a llenar el resto de la ventana
    // se veía extraño — mejor dejar que la tabla use su tamaño por defecto y
    // la página scrollee normalmente si hace falta.
    <div className="flex flex-col gap-6">
      {/* KPIs: ocultos durante la carga y ante un error —no hay datos que
          resumir y `orders` arranca en `[]`, así que mostrarían ceros que se
          leerían como reales—, igual que `EmbroideryStats` en su vista. La
          tabla NO se gatea: se monta siempre y alterna solo su área de datos,
          de modo que el toolbar sigue visible durante la carga y el error. */}
      {!isLoading && !showError && <KpiGrid items={kpis} />}

      <OperationsOrderTable
        orders={orders}
        isLoading={isLoading}
        isError={showError}
        errorMessage={extractErrorMessage(error, 'No se pudo cargar la información.')}
        onViewDetail={handleViewDetail}
        onEditMesaControl={handleEditMesaControl}
        onProgramar={setSelectedOrderForSchedule}
        onRefetch={handleRefetch}
        isRefetching={isRefetching}
      />

      {selectedOrderForSchedule && (
        <PedidoProgramacionDialog
          key={`schedule-${selectedOrderForSchedule.id}`}
          open
          onOpenChange={(open) => {
            if (!open) setSelectedOrderForSchedule(null);
          }}
          order={selectedOrderForSchedule}
        />
      )}
    </div>
  );
}
