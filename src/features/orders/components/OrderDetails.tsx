"use client";

import { Order } from "../interfaces/order.interface";
import { format, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { getStatusStyles } from "../utils/getStatusStyle";
import { formatCurrency } from "@/src/utils/formatCurrency";

interface OrderDetailsProps {
  order: Order;
}

export const OrderDetails = ({ order }: OrderDetailsProps) => {
  const displayValue = (value?: string | number | null) => {
    if (value === undefined || value === null || value === "") return "-";
    return String(value);
  };
  const getReadableCreatedAt = (value: string) => {
    if (!value) return "-";
    const normalizedIsoValue = value.includes(" ") ? value.replace(" ", "T") : value;
    const normalizedTimezoneValue = /[+-]\d{2}$/.test(normalizedIsoValue)
      ? `${normalizedIsoValue}:00`
      : normalizedIsoValue;
    const parsedDate = parseISO(normalizedTimezoneValue);
    if (!isValid(parsedDate)) return "-";
    return format(parsedDate, "d 'de' MMMM yyyy, HH:mm", { locale: es });
  };

  const statusLabel = order.estatus_label;
  const statusClassName = getStatusStyles(order);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <p className="text-xs uppercase text-slate-400 font-semibold">Estatus</p>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${statusClassName}`}>
            {statusLabel}
          </span>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <p className="text-xs uppercase text-slate-400 font-semibold">Folio</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white mt-2">
            {displayValue(order.pedido_folio)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <p className="text-xs uppercase text-slate-400 font-semibold">Fecha</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white mt-2">
            {getReadableCreatedAt(order.created_at)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 space-y-4 lg:col-span-2">
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold">Cliente</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {displayValue(order.cliente_nombre || order.cliente_razon_social)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {displayValue(order.cliente_razon_social)}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">ID pedido</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {displayValue(order.pedido_id)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">ID cliente</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {displayValue(order.cliente)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Uso CFDI</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {displayValue(order.uso_cfdi)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Orden Compra</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {displayValue(order.oc)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 space-y-3">
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold">Total</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {formatCurrency(Number(order.gran_total) || 0)}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Autorizada</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {displayValue(getReadableCreatedAt(order.autorizada_at ?? ""))}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Cambios solicitados</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {displayValue(getReadableCreatedAt(order.cambios_solicitados_at ?? ""))}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Creado</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {displayValue(getReadableCreatedAt(order.created_at))}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Actualizado</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {displayValue(getReadableCreatedAt(order.updated_at))}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
