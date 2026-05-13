'use client';

import { useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { MainDialog } from '@/src/components/MainDialog';
import { Button } from '@/src/components/Button';
import {
  WarehouseIcon,
  PackageCheckIcon,
  PackageXIcon,
  CheckCircleIcon,
  ChevronRightIcon,
} from '@/src/components/Icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { OrderControl, OrderControlItem, OrderControlStatus } from '../types/order-control.types';

interface OrderStockReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderControl;
  onSave: (updatedOrder: OrderControl) => void;
}

type ItemAvailability = 'full' | 'partial' | 'none';

function getItemAvailability(item: OrderControlItem): ItemAvailability {
  if (item.stockDisponible >= item.cantidadSolicitada) return 'full';
  if (item.stockDisponible === 0) return 'none';
  return 'partial';
}

const availabilityStyles: Record<
  ItemAvailability,
  { row: string; badge: string; label: string; iconClass: string }
> = {
  full: {
    row: 'bg-emerald-50/40 dark:bg-emerald-900/10',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    label: 'Disponible',
    iconClass: 'text-emerald-500',
  },
  partial: {
    row: 'bg-amber-50/40 dark:bg-amber-900/10',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    label: 'Parcial',
    iconClass: 'text-amber-500',
  },
  none: {
    row: 'bg-rose-50/40 dark:bg-rose-900/10',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    label: 'Sin stock',
    iconClass: 'text-rose-500',
  },
};

// Componente auxiliar: indicador de pasos del flujo operativo (2 pasos fijos)
function FlowStepper() {
  const steps = [
    { label: 'Revisar inventario', done: true },
    { label: 'Confirmar fecha', done: false },
  ];

  return (
    <div
      className="flex items-center gap-1 flex-wrap mt-1 mb-4"
      role="list"
      aria-label="Pasos del flujo operativo"
    >
      {steps.map((step, idx) => (
        <div key={step.label} className="flex items-center gap-1" role="listitem">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
              step.done
                ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
                : 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500'
            }`}
          >
            {step.done && <CheckCircleIcon className="w-3 h-3" aria-hidden="true" />}
            {step.label}
          </div>
          {idx < steps.length - 1 && (
            <ChevronRightIcon
              className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0"
              aria-hidden="true"
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function OrderStockReviewDialog({
  open,
  onOpenChange,
  order,
  onSave,
}: OrderStockReviewDialogProps) {
  // Estado local: checkboxes "requiere producción" por productoId
  const [productionFlags, setProductionFlags] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(order.items.map((i) => [i.productoId, i.requiereProduccion])),
  );

  const allAvailable = useMemo(
    () => order.items.every((i) => i.stockDisponible >= i.cantidadSolicitada),
    [order.items],
  );

  // Porcentaje global de disponibilidad del pedido
  const stockPercent = useMemo(() => {
    const totalSolicitado = order.items.reduce((s, i) => s + i.cantidadSolicitada, 0);
    const totalDisponible = order.items.reduce(
      (s, i) => s + Math.min(i.stockDisponible, i.cantidadSolicitada),
      0,
    );
    return totalSolicitado > 0 ? Math.round((totalDisponible / totalSolicitado) * 100) : 100;
  }, [order.items]);

  const handleToggle = (productoId: number) => {
    setProductionFlags((prev) => ({ ...prev, [productoId]: !prev[productoId] }));
  };

  const handleSave = () => {
    const updatedItems = order.items.map((i) => ({
      ...i,
      requiereProduccion: productionFlags[i.productoId] ?? false,
    }));
    const anyProduction = updatedItems.some((i) => i.requiereProduccion);
    const newStatus: OrderControlStatus = anyProduction
      ? 'requiere_produccion'
      : allAvailable
        ? 'stock_disponible'
        : 'pendiente';

    onSave({ ...order, items: updatedItems, controlStatus: newStatus });
    toast.success('Configuración de inventario guardada');
  };

  const formattedDate = format(new Date(order.created_at), "d 'de' MMMM yyyy", { locale: es });

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="860px"
      showCloseButton={false}
      actionButtonClose={false}
      title={
        <span className="flex items-center gap-2">
          <WarehouseIcon className="w-4 h-4 text-sky-500" aria-hidden="true" />
          Revisión de inventario — {order.folio}
        </span>
      }
      description={`${order.cliente_razon_social} · ${formattedDate}`}
      actionButton={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave}>
            {allAvailable ? 'Confirmar' : 'Guardar configuración'}
          </Button>
        </div>
      }
    >
      {/* Indicador del flujo */}
      <FlowStepper />

      {/* Barra de disponibilidad global */}
      <div className="mb-4">
        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mb-1.5">
          <span>Disponibilidad global del pedido</span>
          <span className="font-semibold tabular-nums">{stockPercent}%</span>
        </div>
        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              stockPercent >= 100
                ? 'bg-emerald-500'
                : stockPercent >= 50
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
            }`}
            style={{ width: `${stockPercent}%` }}
            role="progressbar"
            aria-valuenow={stockPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Stock disponible: ${stockPercent}%`}
          />
        </div>
      </div>

      {/* Tabla de productos con disponibilidad */}
      <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
        <table
          className="w-full text-sm"
          role="table"
          aria-label="Disponibilidad de productos del pedido"
        >
          <thead>
            <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
              <th
                scope="col"
                className="text-left py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Producto
              </th>
              <th
                scope="col"
                className="text-center py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Solicitado
              </th>
              <th
                scope="col"
                className="text-center py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                En almacén
              </th>
              <th
                scope="col"
                className="text-center py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Diferencia
              </th>
              <th
                scope="col"
                className="text-center py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Estado
              </th>
              <th
                scope="col"
                className="text-center py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                ¿Producción?
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {order.items.map((item) => {
              const avail = getItemAvailability(item);
              const styles = availabilityStyles[avail];
              const diff = item.stockDisponible - item.cantidadSolicitada;
              const needsProd = avail !== 'full';
              const ItemIcon = avail === 'full' ? PackageCheckIcon : PackageXIcon;

              return (
                <tr key={item.productoId} className={`${styles.row} transition-colors`}>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <ItemIcon
                        className={`w-4 h-4 shrink-0 ${styles.iconClass}`}
                        aria-hidden="true"
                      />
                      <span className="font-medium text-slate-800 dark:text-white text-xs leading-snug">
                        {item.descripcion}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                      {item.cantidadSolicitada}
                    </span>
                    <span className="ml-1 text-xs text-slate-400">{item.unidad}</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                      {item.stockDisponible}
                    </span>
                    <span className="ml-1 text-xs text-slate-400">{item.unidad}</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`font-mono font-bold text-sm ${
                        diff >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {diff >= 0 ? `+${diff}` : diff}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${styles.badge}`}
                    >
                      {styles.label}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {needsProd ? (
                      <label
                        className="inline-flex items-center justify-center cursor-pointer"
                        aria-label={`${item.descripcion}: marcar como requiere producción`}
                      >
                        <input
                          type="checkbox"
                          checked={productionFlags[item.productoId] ?? false}
                          onChange={() => handleToggle(item.productoId)}
                          className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer accent-sky-600"
                        />
                      </label>
                    ) : (
                      <CheckCircleIcon
                        className="w-4 h-4 text-emerald-500 mx-auto"
                        aria-label="Stock completo, sin necesidad de producción"
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Aviso de apartado de stock — visible solo cuando el 100% está disponible */}
      {allAvailable && (
        <div className="mt-3">
          <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2.5 border border-amber-200/60 dark:border-amber-700/30 leading-relaxed">
            Al confirmar, estas cantidades quedarán{' '}
            <strong>apartadas del almacén</strong> y no estarán disponibles para otros pedidos.
          </p>
        </div>
      )}

      {/* Hint inferior — visible cuando hay productos sin stock suficiente */}
      {!allAvailable && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Marca los productos con stock insuficiente para incluirlos en la orden de producción.
        </p>
      )}
    </MainDialog>
  );
}
