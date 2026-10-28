'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import KpiGrid, { type KpiCompactItem } from '@/src/components/KpiGrid';
import {
  CheckCircleIcon,
  ClockIcon,
  ListaPreciosIcon,
  PedidosIcon,
} from '@/src/components/Icons';
import { extractErrorMessage } from '@/src/utils/extractErrorMessage';
import { isInitialLoadError } from '@/src/utils/isInitialLoadError';
import { CurrencyTotalsValue } from '@/src/components/CurrencyTotalsValue';
import { useCurrencies } from '@/src/features/currency/hooks/useCurrencies';
import { valorTotalPorMoneda } from '@/src/features/orders/utils/valorTotalPorMoneda';
import { ordersQueryKey, useOrders } from '@/src/features/orders/hooks/useOrders';
import type { PedidoListItem } from '@/src/features/orders/interfaces/order.interface';
import { isOrderConfirmed } from './OperationsOrderColumns';
import { PedidoProgramacionDialog } from '@/src/features/orders/components/PedidoProgramacionDialog';
import { PedidoCancelDialog } from '@/src/features/orders/components/PedidoCancelDialog';
import { OperationsOrderTable } from './OperationsOrderTable';
import { OrderStockReviewDialog } from './OrderStockReviewDialog';

// Componente principal de la Mesa de Control de Pedidos.
export function OperationsOrderPanel() {
  const { orders, isLoading, isError, error, hasLoaded } = useOrders();
  // El listado solo trae la PK de la moneda (`moneda`); el código ISO sale del
  // catálogo, con la misma caché (`["currencies"]`) que `OrderCurrencyProvider`.
  const { data: currencies, isLoading: isLoadingCurrencies } = useCurrencies();
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
  const [selectedOrderForStock, setSelectedOrderForStock] =
    useState<PedidoListItem | null>(null);
  // Al cancelarse, la fila SALE del listado: por eso el diálogo vive aquí y se
  // monta siempre (`PedidoCancelDialog` conserva su copia del pedido).
  const [selectedOrderForCancel, setSelectedOrderForCancel] =
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
    // Mientras el catálogo carga, "—" en vez de importes sin símbolo que
    // cambiarían al llegar. Si falla, cada PK sin símbolo (ver
    // `valorTotalPorMoneda`): la tarjeta nunca se queda en "—".
    const valorTotal =
      isLoadingCurrencies && !currencies ? null : valorTotalPorMoneda(orders, currencies);
    return {
      total: orders.length,
      confirmados,
      porConfirmar: orders.length - confirmados,
      valorTotal,
    };
  }, [orders, currencies, isLoadingCurrencies]);

  // Porcentaje del total, para que cada tarjeta diga cuánto pesa sin hacer cuentas.
  const pctOfTotal = (n: number) => (counts.total ? Math.round((n / counts.total) * 100) : 0);

  // Variante compacta de `KpiGrid`: mismo lenguaje que el resto de listados con
  // indicadores, y en móvil un carrusel de una fila en vez de 4 tarjetas
  // apiladas encima de la tabla.
  const kpis: KpiCompactItem[] = [
    {
      label: 'Total pedidos',
      value: counts.total.toString(),
      icon: PedidosIcon,
      iconClass: 'text-sky-500',
      detail: 'En mesa de control',
      hideProgress: true,
    },
    {
      label: 'Por confirmar',
      value: counts.porConfirmar.toString(),
      icon: ClockIcon,
      iconClass: 'text-amber-500',
      progress: pctOfTotal(counts.porConfirmar),
      detail: `${pctOfTotal(counts.porConfirmar)}% del total · fecha pendiente`,
    },
    {
      label: 'Confirmados',
      value: counts.confirmados.toString(),
      icon: CheckCircleIcon,
      iconClass: 'text-cyan-500',
      progress: pctOfTotal(counts.confirmados),
      detail: `${pctOfTotal(counts.confirmados)}% del total · con fecha`,
    },
    {
      label: 'Valor total',
      value: counts.valorTotal ? <CurrencyTotalsValue totals={counts.valorTotal} /> : '—',
      icon: ListaPreciosIcon,
      iconClass: 'text-emerald-500',
      hideProgress: true,
      info: 'Suma de los pedidos por moneda; cada moneda se muestra por separado.',
    },
  ];

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
      {!isLoading && !showError && <KpiGrid compact items={kpis} />}

      <OperationsOrderTable
        orders={orders}
        isLoading={isLoading}
        isError={showError}
        errorMessage={extractErrorMessage(error, 'No se pudo cargar la información.')}
        onViewDetail={handleViewDetail}
        onEditMesaControl={handleEditMesaControl}
        onProgramar={setSelectedOrderForSchedule}
        onReviewStock={setSelectedOrderForStock}
        onCancel={setSelectedOrderForCancel}
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

      {selectedOrderForStock && (
        <OrderStockReviewDialog
          key={`stock-${selectedOrderForStock.id}`}
          open
          onOpenChange={(open) => {
            if (!open) setSelectedOrderForStock(null);
          }}
          orderId={selectedOrderForStock.id}
          folio={selectedOrderForStock.folio}
          clientName={
            selectedOrderForStock.cliente_razon_social ||
            selectedOrderForStock.cliente_nombre
          }
          createdAt={selectedOrderForStock.created_at}
        />
      )}

      <PedidoCancelDialog
        pedido={selectedOrderForCancel}
        onClose={() => setSelectedOrderForCancel(null)}
      />
    </div>
  );
}
