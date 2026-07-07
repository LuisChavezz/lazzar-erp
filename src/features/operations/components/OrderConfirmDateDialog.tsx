'use client';

import { useState } from 'react';
import { MainDialog } from '@/src/components/MainDialog';
import { Button } from '@/src/components/Button';
import { TasksIcon, InfoIcon } from '@/src/components/Icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency, safeParseAmount } from '@/src/utils/formatCurrency';
import type { Order } from '@/src/features/orders/interfaces/order.interface';

interface OrderConfirmDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
}

export function OrderConfirmDateDialog({
  open,
  onOpenChange,
  order,
}: OrderConfirmDateDialogProps) {
  const today = new Date().toISOString().split('T')[0];
  // Prefill con la fecha de confirmación existente (solo la parte de fecha) o hoy.
  const [selectedDate, setSelectedDate] = useState(
    order.fecha_confirmacion?.slice(0, 10) || today,
  );

  const formattedSelected = selectedDate
    ? format(new Date(selectedDate + 'T12:00:00'), "EEEE d 'de' MMMM yyyy", { locale: es })
    : null;

  const handleConfirm = () => {
    // TODO: aún no existe un endpoint de backend confirmado para la confirmación
    // de fecha del pedido — conectar la mutación cuando esté disponible.
    // El campo destino en el pedido es `fecha_confirmacion`; falta la mutación/endpoint
    // (p.ej. PATCH /ventas/pedidos/<id>/) para persistir `selectedDate`.
    onOpenChange(false);
  };

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
          Confirmar fecha del pedido
        </span>
      }
      description={`${order.folio} · ${order.cliente_razon_social}`}
      actionButton={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled>
            Confirmar fecha
          </Button>
        </div>
      }
    >
      <div className="py-2 space-y-4">
        {/* Resumen del pedido (datos reales) */}
        <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-4 py-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">Total del pedido</span>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
            {formatCurrency(safeParseAmount(order.gran_total))}
          </span>
        </div>

        {/* Aviso: la persistencia de esta acción aún no está conectada al backend. */}
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 px-3 py-2.5">
          <InfoIcon className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Esta función aún está en desarrollo. Por el momento no es posible guardar la fecha
            de confirmación.
          </p>
        </div>

        {/* Selector de fecha */}
        <div>
          <label
            htmlFor="fecha-confirmacion"
            className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2"
          >
            Fecha de confirmación
          </label>
          <input
            id="fecha-confirmacion"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-shadow scheme-light dark:scheme-dark"
            aria-describedby={formattedSelected ? 'date-preview' : undefined}
          />
        </div>

        {/* Preview legible de la fecha */}
        {formattedSelected && (
          <p id="date-preview" className="text-xs text-slate-500 dark:text-slate-400 capitalize">
            Fecha seleccionada:{' '}
            <strong className="text-slate-700 dark:text-slate-200">{formattedSelected}</strong>
          </p>
        )}
      </div>
    </MainDialog>
  );
}
