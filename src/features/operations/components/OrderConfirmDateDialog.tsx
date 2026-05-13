'use client';

import { useState } from 'react';
import { MainDialog } from '@/src/components/MainDialog';
import { Button } from '@/src/components/Button';
import { TasksIcon, CheckCircleIcon } from '@/src/components/Icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { OrderControl } from '../types/order-control.types';

interface OrderConfirmDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderControl;
}

export function OrderConfirmDateDialog({
  open,
  onOpenChange,
  order,
}: OrderConfirmDateDialogProps) {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);

  const formattedSelected = selectedDate
    ? format(new Date(selectedDate + 'T12:00:00'), "EEEE d 'de' MMMM yyyy", { locale: es })
    : null;

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="480px"
      showCloseButton={false}
      actionButtonClose={false}
      title={
        <span className="flex items-center gap-2">
          <TasksIcon className="w-4 h-4 text-sky-500" aria-hidden="true" />
          Confirmar fecha de entrega
        </span>
      }
      description={`${order.folio} · ${order.cliente_razon_social}`}
      actionButton={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => onOpenChange(false)}>
            Confirmar fecha
          </Button>
        </div>
      }
    >
      <div className="py-2 space-y-4">
        {/* Resumen del pedido */}
        <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-4 py-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
              {order.piezas.toLocaleString('es-MX')}
            </span>{' '}
            pzas ·{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {order.items.length}
            </span>{' '}
            productos
          </div>
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-semibold">
            <CheckCircleIcon className="w-3 h-3" aria-hidden="true" />
            Stock 100%
          </span>
        </div>

        {/* Selector de fecha */}
        <div>
          <label
            htmlFor="delivery-date"
            className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2"
          >
            Fecha estimada de entrega
          </label>
          <input
            id="delivery-date"
            type="date"
            value={selectedDate}
            min={today}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-shadow scheme-light dark:scheme-dark"
            aria-describedby={formattedSelected ? 'date-preview' : undefined}
          />
        </div>

        {/* Preview legible de la fecha */}
        {formattedSelected && (
          <p
            id="date-preview"
            className="text-xs text-slate-500 dark:text-slate-400 capitalize"
          >
            Entrega programada:{' '}
            <strong className="text-slate-700 dark:text-slate-200">{formattedSelected}</strong>
          </p>
        )}
      </div>
    </MainDialog>
  );
}
