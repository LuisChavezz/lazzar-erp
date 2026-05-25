'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import KpiGrid, { type KpiItem } from '@/src/components/KpiGrid';
import {
  EmbarquesIcon,
  PedidosIcon,
  TasksIcon,
  WarehouseIcon,
} from '@/src/components/Icons';
import { MOCK_ORDERS } from '../mocks/orders.mock';
import type { OrderControl, OrderControlStatus } from '../types/order-control.types';
import { OrderConfirmDateDialog } from './OrderConfirmDateDialog';
import { OperationsOrderTable } from './OperationsOrderTable';

type OrderControlFilter = 'todos' | 'confirmado' | 'listo_para_liberar' | 'liberado';

const controlStatusConfig: Record<
  OrderControlStatus,
  {
    badgeLabel: string;
    badge: string;
    dot: string;
    borderColor: string;
    text: string;
    cls: string;
  }
> = {
  confirmado: {
    badgeLabel: 'Confirmado',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    dot: 'bg-violet-500',
    borderColor: 'rgb(139 92 246)',
    text: 'Confirmado',
    cls: 'text-violet-600 dark:text-violet-400',
  },
  listo_para_liberar: {
    badgeLabel: 'Listo para liberar',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    dot: 'bg-sky-500',
    borderColor: 'rgb(14 165 233)',
    text: 'Listo para liberar',
    cls: 'text-sky-600 dark:text-sky-400',
  },
  liberado: {
    badgeLabel: 'Liberado',
    badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    dot: 'bg-cyan-500',
    borderColor: 'rgb(6 182 212)',
    text: 'Liberado',
    cls: 'text-cyan-600 dark:text-cyan-400',
  },
};

// Tarjeta individual de pedido preservada para posible reutilizacion futura.
function OrderCard({
  order,
  onConfirmDate,
  onRelease,
}: {
  order: OrderControl;
  onConfirmDate: () => void;
  onRelease: () => void;
}) {
  const ctrlCfg = controlStatusConfig[order.controlStatus];
  const date = format(new Date(order.created_at), 'd MMM yyyy', { locale: es });

  return (
    <article
      className="flex flex-col rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-all duration-200 border-l-4 overflow-hidden"
      style={{ borderLeftColor: ctrlCfg.borderColor }}
      aria-label={`Pedido ${order.folio}`}
    >
      <div className="flex items-start justify-between px-4 pt-4 pb-2 gap-2">
        <div className="flex-1 min-w-0">
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
          <p
            className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate"
            title={order.cliente_razon_social}
          >
            {order.cliente_razon_social}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${ctrlCfg.badge}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ctrlCfg.dot}`} aria-hidden="true" />
          {ctrlCfg.badgeLabel}
        </span>
      </div>

      <div className="flex items-center gap-4 px-4 py-1.5 text-xs text-slate-500 dark:text-slate-400">
        <span>
          <strong className="text-slate-700 dark:text-slate-200 tabular-nums">
            {order.piezas.toLocaleString('es-MX')}
          </strong>{' '}
          pzas.
        </span>
        <span>
          <strong className="text-slate-700 dark:text-slate-200">{order.items.length}</strong>{' '}
          productos
        </span>
        <span className="ml-auto">{date}</span>
      </div>

      <div className="px-4 pb-2">
        <span className={`text-[10px] font-semibold uppercase tracking-wide ${ctrlCfg.cls}`}>
          {ctrlCfg.text}
        </span>
      </div>

      <div className="mt-auto border-t border-slate-100 dark:border-white/5 px-4 py-2.5">
        {order.controlStatus === 'liberado' ? (
          <span className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
            <EmbarquesIcon className="w-3.5 h-3.5" aria-hidden="true" />
            Enviado a Programacion y Embarques
          </span>
        ) : order.controlStatus === 'listo_para_liberar' ? (
          <button
            onClick={onRelease}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors cursor-pointer"
            aria-label={`Liberar el pedido ${order.folio} a Programacion y Embarques`}
          >
            <EmbarquesIcon className="w-3.5 h-3.5" aria-hidden="true" />
            Liberar
          </button>
        ) : (
          <button
            onClick={onConfirmDate}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors cursor-pointer"
            aria-label={`Confirmar fecha de entrega del pedido ${order.folio}`}
          >
            <TasksIcon className="w-3.5 h-3.5" aria-hidden="true" />
            Confirmar fecha
          </button>
        )}
      </div>
    </article>
  );
}

// Componente principal de la Mesa de Control de Pedidos.
export function OperationsOrderPanel() {
  const [selectedOrderForDate, setSelectedOrderForDate] = useState<OrderControl | null>(null);
  const [selectedOrderForRelease, setSelectedOrderForRelease] = useState<OrderControl | null>(
    null,
  );
  const [controlFilter, setControlFilter] = useState<OrderControlFilter>('todos');

  const counts = useMemo(
    () => ({
      total: MOCK_ORDERS.length,
      confirmados: MOCK_ORDERS.filter((o) => o.controlStatus === 'confirmado').length,
      listoParaLiberar: MOCK_ORDERS.filter((o) => o.controlStatus === 'listo_para_liberar').length,
      liberados: MOCK_ORDERS.filter((o) => o.controlStatus === 'liberado').length,
    }),
    [],
  );

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
        label: 'Confirmados',
        value: counts.confirmados.toString(),
        icon: TasksIcon,
        iconBgClass: 'bg-violet-50 dark:bg-violet-500/10',
        iconClass: 'text-violet-500',
        subLabel: 'Fecha por programar',
        status: 'positive',
        progress: Math.round((counts.confirmados / counts.total) * 100),
      },
      {
        label: 'Listos para liberar',
        value: counts.listoParaLiberar.toString(),
        icon: EmbarquesIcon,
        iconBgClass: 'bg-sky-50 dark:bg-sky-500/10',
        iconClass: 'text-sky-500',
        subLabel: 'Por liberar',
        status: 'positive',
        progress: Math.round((counts.listoParaLiberar / counts.total) * 100),
      },
      {
        label: 'Liberados',
        value: counts.liberados.toString(),
        icon: EmbarquesIcon,
        iconBgClass: 'bg-cyan-50 dark:bg-cyan-500/10',
        iconClass: 'text-cyan-500',
        subLabel: 'Enviados a embarques',
        status: 'positive',
        progress: Math.round((counts.liberados / counts.total) * 100),
      },
    ],
    [counts],
  );

  const filterTabs: { key: OrderControlFilter; label: string }[] = [
    { key: 'todos', label: `Todos (${counts.total})` },
    { key: 'confirmado', label: `Confirmados (${counts.confirmados})` },
    { key: 'listo_para_liberar', label: `Listo para liberar (${counts.listoParaLiberar})` },
    { key: 'liberado', label: `Liberado (${counts.liberados})` },
  ];

  const filtered = useMemo(
    () =>
      MOCK_ORDERS.filter((order) =>
        controlFilter === 'todos' ? true : order.controlStatus === controlFilter,
      ),
    [controlFilter],
  );

  return (
    <div className="space-y-6">
      <KpiGrid items={kpis} />

      <div
        className="flex items-center gap-1 flex-wrap"
        role="group"
        aria-label="Filtrar por estado del pedido"
      >
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setControlFilter(tab.key)}
            aria-pressed={controlFilter === tab.key}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              controlFilter === tab.key
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <OperationsOrderTable
        orders={filtered}
        onConfirmDate={setSelectedOrderForDate}
        onRelease={setSelectedOrderForRelease}
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

      {selectedOrderForRelease && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setSelectedOrderForRelease(null);
          }}
          title="Liberar pedido a Programacion"
          description={`¿Confirmas la liberacion del pedido ${selectedOrderForRelease.folio} de ${selectedOrderForRelease.cliente_razon_social} a Programacion y Embarques? Esta accion iniciara el proceso de despacho.`}
          confirmText="Liberar"
          cancelText="Cancelar"
          confirmColor="blue"
          onConfirm={() => setSelectedOrderForRelease(null)}
          maxWidth="480px"
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cuadricula de tarjetas — implementacion preservada para uso futuro.
// No se renderiza en el panel activo; se mantiene para posible reutilizacion.
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function OperationsOrderCardGrid({
  orders,
  onConfirmDate,
  onRelease,
}: {
  orders: OrderControl[];
  onConfirmDate: (order: OrderControl) => void;
  onRelease: (order: OrderControl) => void;
}) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600">
        <WarehouseIcon className="w-12 h-12 mb-3 opacity-30" aria-hidden="true" />
        <p className="text-sm font-medium">No se encontraron pedidos</p>
        <p className="text-xs mt-1 opacity-70">
          Intenta con otros terminos de busqueda o filtros.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          onConfirmDate={() => onConfirmDate(order)}
          onRelease={() => onRelease(order)}
        />
      ))}
    </div>
  );
}
