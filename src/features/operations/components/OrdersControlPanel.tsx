'use client';

import { useState, useMemo } from 'react';
import { MOCK_ORDERS } from '../mocks/orders.mock';
import type { OrderControl, OrderStockStatus } from '../types/order-control.types';
import { OrderStockReviewDialog } from './OrderStockReviewDialog';
import { OrderConfirmDateDialog } from './OrderConfirmDateDialog';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import KpiGrid, { type KpiItem } from '@/src/components/KpiGrid';
import { SearchInput } from '@/src/components/SearchInput';
import {
  PedidosIcon,
  PackageCheckIcon,
  PackageXIcon,
  EmbarquesIcon,
  WarehouseIcon,
  TasksIcon,
  SortIcon,
} from '@/src/components/Icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type StockFilter = 'todos' | OrderStockStatus | 'disponible' | 'confirmado' | 'listo_para_liberar' | 'liberado';

// Colores CSS de borde izquierdo por estado (inline style para garantizar dark mode)
const borderLeftColors: Record<string, string> = {
  disponible: 'rgb(16 185 129)',         // emerald-500
  parcial: 'rgb(245 158 11)',            // amber-500
  produccion: 'rgb(239 68 68)',          // rose-500
  confirmado: 'rgb(139 92 246)',         // violet-500
  listo_para_liberar: 'rgb(14 165 233)', // sky-500
  liberado: 'rgb(6 182 212)',            // cyan-500
};

// Configuración visual por estado de stock
const stockConfig = {
  disponible: {
    label: 'Disponible',
    border: 'border-l-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
    ctrlText: 'text-emerald-600 dark:text-emerald-400',
  },
  parcial: {
    label: 'Parcial',
    border: 'border-l-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    dot: 'bg-amber-500',
    bar: 'bg-amber-400',
    ctrlText: 'text-amber-600 dark:text-amber-400',
  },
  produccion: {
    label: 'Producción',
    border: 'border-l-rose-500',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    dot: 'bg-rose-500',
    bar: 'bg-rose-500',
    ctrlText: 'text-rose-600 dark:text-rose-400',
  },
} as const;

const controlStatusConfig: Record<string, { text: string; cls: string }> = {
  pendiente: { text: 'Pendiente revisión', cls: 'text-slate-400 dark:text-slate-500' },
  stock_disponible: { text: 'Stock disponible', cls: 'text-emerald-600 dark:text-emerald-400' },
  requiere_produccion: { text: 'Producción programada', cls: 'text-sky-600 dark:text-sky-400' },
  confirmado: { text: 'Stock confirmado', cls: 'text-slate-400 dark:text-slate-500' },
  listo_para_liberar: { text: 'Listo para liberar', cls: 'text-sky-600 dark:text-sky-400' },
  liberado: { text: 'Liberado', cls: 'text-cyan-600 dark:text-cyan-400' },
};

// Tarjeta individual de pedido
function OrderCard({
  order,
  onReview,
  onConfirmDate,
  onRelease,
}: {
  order: OrderControl;
  onReview: () => void;
  onConfirmDate: () => void;
  onRelease: () => void;
}) {
  const cfg = stockConfig[order.stockStatus];
  const ctrlCfg = controlStatusConfig[order.controlStatus] ?? controlStatusConfig.pendiente;

  // Configuración visual derivada del estado de control (sobreescribe el estado de stock para etapas avanzadas)
  const visualCfg =
    order.controlStatus === 'liberado'
      ? {
          badgeLabel: 'Liberado',
          badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
          dot: 'bg-cyan-500',
          bar: 'bg-cyan-500',
          borderColor: borderLeftColors.liberado,
        }
      : order.controlStatus === 'confirmado'
        ? {
            badgeLabel: 'Confirmado',
            badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
            dot: 'bg-violet-500',
            bar: 'bg-violet-500',
            borderColor: borderLeftColors.confirmado,
          }
        : order.controlStatus === 'listo_para_liberar'
          ? {
              badgeLabel: 'Listo para liberar',
              badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
              dot: 'bg-sky-500',
              bar: 'bg-sky-500',
              borderColor: borderLeftColors.listo_para_liberar,
            }
          : {
              badgeLabel: cfg.label,
              badge: cfg.badge,
              dot: cfg.dot,
              bar: cfg.bar,
              borderColor: borderLeftColors[order.stockStatus],
            };

  // Porcentaje de disponibilidad de stock
  const stockPct = useMemo(() => {
    const sol = order.items.reduce((s, i) => s + i.cantidadSolicitada, 0);
    const disp = order.items.reduce(
      (s, i) => s + Math.min(i.stockDisponible, i.cantidadSolicitada),
      0,
    );
    return sol > 0 ? Math.round((disp / sol) * 100) : 100;
  }, [order.items]);

  const date = format(new Date(order.created_at), 'd MMM yyyy', { locale: es });

  return (
    <article
      className="flex flex-col rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-all duration-200 border-l-4 overflow-hidden"
      style={{ borderLeftColor: visualCfg.borderColor }}
      aria-label={`Pedido ${order.folio}`}
    >
      {/* Encabezado */}
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
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${visualCfg.badge}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${visualCfg.dot}`} aria-hidden="true" />
          {visualCfg.badgeLabel}
        </span>
      </div>

      {/* Métricas */}
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

      {/* Barra de stock */}
      <div className="px-4 pb-2">
        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
          <span>Stock disponible</span>
          <span className="font-semibold tabular-nums">{stockPct}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${visualCfg.bar}`}
            style={{ width: `${stockPct}%` }}
            role="progressbar"
            aria-valuenow={stockPct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Estado del flujo */}
      <div className="px-4 pb-2">
        <span className={`text-[10px] font-semibold uppercase tracking-wide ${ctrlCfg.cls}`}>
          {ctrlCfg.text}
        </span>
      </div>

      {/* CTA */}
      <div className="mt-auto border-t border-slate-100 dark:border-white/5 px-4 py-2.5">
        {order.controlStatus === 'liberado' ? (
          <span className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
            <EmbarquesIcon className="w-3.5 h-3.5" aria-hidden="true" />
            Enviado a Programación y Embarques
          </span>
        ) : order.controlStatus === 'listo_para_liberar' ? (
          <button
            onClick={onRelease}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors cursor-pointer"
            aria-label={`Liberar el pedido ${order.folio} a Programación y Embarques`}
          >
            <EmbarquesIcon className="w-3.5 h-3.5" aria-hidden="true" />
            Liberar
          </button>
        ) : order.controlStatus === 'confirmado' ? (
          <button
            onClick={onConfirmDate}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors cursor-pointer"
            aria-label={`Confirmar fecha de entrega del pedido ${order.folio}`}
          >
            <TasksIcon className="w-3.5 h-3.5" aria-hidden="true" />
            Confirmar fecha
          </button>
        ) : (
          <button
            onClick={onReview}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors cursor-pointer"
            aria-label={`Revisar inventario del pedido ${order.folio}`}
          >
            <WarehouseIcon className="w-3.5 h-3.5" aria-hidden="true" />
            Revisar inventario
          </button>
        )}
      </div>
    </article>
  );
}

// Componente principal de la Mesa de Control de Pedidos
export function OrdersControlPanel() {
  const [orders, setOrders] = useState<OrderControl[]>(MOCK_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState<OrderControl | null>(null);
  const [selectedOrderForDate, setSelectedOrderForDate] = useState<OrderControl | null>(null);
  const [selectedOrderForRelease, setSelectedOrderForRelease] = useState<OrderControl | null>(null);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('todos');
  // Ordenamiento por fecha: 'desc' = más reciente primero, 'asc' = más antiguo primero
  const [dateSort, setDateSort] = useState<'desc' | 'asc'>('desc');

  const counts = useMemo(
    () => ({
      total: orders.length,
      stockDisponible: orders.filter((o) => o.controlStatus === 'stock_disponible').length,
      stockConfirmado: orders.filter((o) => o.controlStatus === 'confirmado').length,
      listoParaLiberar: orders.filter((o) => o.controlStatus === 'listo_para_liberar').length,
      liberados: orders.filter((o) => o.controlStatus === 'liberado').length,
      parciales: orders.filter((o) => o.stockStatus === 'parcial').length,
    }),
    [orders],
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
        label: 'Stock disponible',
        value: counts.stockDisponible.toString(),
        icon: PackageCheckIcon,
        iconBgClass: 'bg-emerald-50 dark:bg-emerald-500/10',
        iconClass: 'text-emerald-500',
        subLabel: 'Listos para confirmar',
        status: 'positive',
        progress: Math.round((counts.stockDisponible / counts.total) * 100),
      },
      {
        label: 'Stock parcial',
        value: counts.parciales.toString(),
        icon: PackageXIcon,
        iconBgClass: 'bg-amber-50 dark:bg-amber-500/10',
        iconClass: 'text-amber-500',
        subLabel: 'Stock insuficiente',
        status: 'neutral',
        progress: Math.round((counts.parciales / counts.total) * 100),
      },
      {
        label: 'En liberación',
        value: (counts.stockConfirmado + counts.listoParaLiberar + counts.liberados).toString(),
        icon: EmbarquesIcon,
        iconBgClass: 'bg-sky-50 dark:bg-sky-500/10',
        iconClass: 'text-sky-500',
        subLabel: `${counts.stockConfirmado} confirmado · ${counts.listoParaLiberar} listo · ${counts.liberados} liberado`,
        status: 'positive',
        progress: Math.round(((counts.stockConfirmado + counts.listoParaLiberar + counts.liberados) / counts.total) * 100),
      },
    ],
    [counts],
  );

  const filterTabs: { key: StockFilter; label: string }[] = [
    { key: 'todos', label: `Todos (${counts.total})` },
    { key: 'parcial', label: `Parcial (${counts.parciales})` },
    { key: 'disponible', label: `Stock disponible (${counts.stockDisponible})` },
    { key: 'confirmado', label: `Stock confirmado (${counts.stockConfirmado})` },
    { key: 'listo_para_liberar', label: `Listo para liberar (${counts.listoParaLiberar})` },
    { key: 'liberado', label: `Liberado (${counts.liberados})` },
  ];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const result = orders.filter((o) => {
      const matchSearch =
        q === '' ||
        o.folio.toLowerCase().includes(q) ||
        o.cliente_nombre.toLowerCase().includes(q) ||
        o.cliente_razon_social.toLowerCase().includes(q) ||
        o.oc.toLowerCase().includes(q);
      const matchFilter =
        stockFilter === 'todos'
          ? true
          : stockFilter === 'disponible'
            ? o.controlStatus === 'stock_disponible'
            : stockFilter === 'confirmado'
              ? o.controlStatus === 'confirmado'
              : stockFilter === 'listo_para_liberar'
                ? o.controlStatus === 'listo_para_liberar'
                : stockFilter === 'liberado'
                  ? o.controlStatus === 'liberado'
                  : o.stockStatus === (stockFilter as OrderStockStatus);
      return matchSearch && matchFilter;
    });

    // Aplicar ordenamiento por fecha de creación
    return result.sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return dateSort === 'desc' ? -diff : diff;
    });
  }, [orders, search, stockFilter, dateSort]);

  const handleSaveOrder = (updated: OrderControl) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setSelectedOrder(null);
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <KpiGrid items={kpis} />

      {/* Barra de filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="w-full sm:w-80">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por folio, cliente u OC..."
          />
        </div>
        <div
          className="flex items-center gap-1 flex-wrap"
          role="group"
          aria-label="Filtrar por estado de stock"
        >
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStockFilter(tab.key)}
              aria-pressed={stockFilter === tab.key}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                stockFilter === tab.key
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Botón de ordenamiento por fecha — visualmente separado de los filtros */}
        <button
          onClick={() => setDateSort((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer shrink-0"
          title={dateSort === 'desc' ? 'Ordenado: más reciente primero' : 'Ordenado: más antiguo primero'}
          aria-label={`Cambiar orden de fecha. Actualmente: ${
            dateSort === 'desc' ? 'más reciente primero' : 'más antiguo primero'
          }`}
        >
          <SortIcon className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          Fecha {dateSort === 'desc' ? '↓' : '↑'}
        </button>
      </div>

      {/* Cuadrícula de tarjetas */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600">
          <WarehouseIcon className="w-12 h-12 mb-3 opacity-30" aria-hidden="true" />
          <p className="text-sm font-medium">No se encontraron pedidos</p>
          <p className="text-xs mt-1 opacity-70">
            Intenta con otros términos de búsqueda o filtros.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onReview={() => setSelectedOrder(order)}
              onConfirmDate={() => setSelectedOrderForDate(order)}
              onRelease={() => setSelectedOrderForRelease(order)}
            />
          ))}
        </div>
      )}

      {/* Diálogo de revisión de stock */}
      {selectedOrder && (
        <OrderStockReviewDialog
          key={selectedOrder.id}
          open
          onOpenChange={(open) => {
            if (!open) setSelectedOrder(null);
          }}
          order={selectedOrder}
          onSave={handleSaveOrder}
        />
      )}

      {/* Diálogo de confirmación de fecha de entrega */}
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

      {/* Diálogo de liberación a Programación y Embarques */}
      {selectedOrderForRelease && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setSelectedOrderForRelease(null);
          }}
          title="Liberar pedido a Programación"
          description={`¿Confirmas la liberación del pedido ${selectedOrderForRelease.folio} de ${selectedOrderForRelease.cliente_razon_social} a Programación y Embarques? Esta acción iniciará el proceso de despacho.`}
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
