"use client";

import { Order } from "../interfaces/order.interface";
import { format, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { getOrderStatusLabel, getStatusStyles } from "../utils/getStatusStyle";
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

  const statusLabel = getOrderStatusLabel(order.activo);
  const statusClassName = getStatusStyles(order.activo);
  const customerName = order.clienteNombre || order.razonSocial || `Cliente #${order.cliente}`;
  const orderTotals = {
    subtotal: Number(order.subtotal ?? order.totals?.subtotal ?? 0),
    descuentoTotal: Number(order.descuento_global ?? order.totals?.descuentoTotal ?? 0),
    ivaAmount: Number(order.totals?.ivaAmount ?? 0),
    flete: Number(order.flete ?? order.totals?.flete ?? 0),
    seguro: Number(order.seguros ?? order.totals?.seguro ?? 0),
    anticipo: Number(order.anticipo ?? order.totals?.anticipo ?? 0),
    saldoPendiente: Number(order.totals?.saldoPendiente ?? 0),
    granTotal: Number(order.gran_total ?? order.totals?.granTotal ?? 0),
  };
  const items = order.items ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <p className="text-xs uppercase text-slate-400 font-semibold">Estatus</p>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${statusClassName}`}>
            {statusLabel}
          </span>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <p className="text-xs uppercase text-slate-400 font-semibold">Folio</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white mt-2">
            {displayValue(order.folio)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <p className="text-xs uppercase text-slate-400 font-semibold">Fecha</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white mt-2">
            {getReadableCreatedAt(order.created_at)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <p className="text-xs uppercase text-slate-400 font-semibold">Agente</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white mt-2">
            {displayValue(order.agente)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 space-y-3">
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold">Cliente</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {displayValue(customerName)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {displayValue(order.razonSocial)}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">RFC</p>
              <p className="text-sm font-mono text-slate-800 dark:text-white">
                {displayValue(order.rfc)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Régimen</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {displayValue(order.regimenFiscal)}
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
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Forma de pago</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {displayValue(order.forma_pago)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Método de pago</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {displayValue(order.metodo_pago)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Persona pagos</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {displayValue(order.persona_pagos)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Correo facturas</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {displayValue(order.correo_facturas)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Teléfono pagos</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {displayValue(order.telefono_pagos)}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold">Dirección fiscal</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {displayValue(order.direccionFiscal)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {displayValue(order.coloniaFiscal)}, {displayValue(order.ciudadFiscal)}{" "}
              {displayValue(order.estadoFiscal)}, {displayValue(order.codigoPostalFiscal)}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 space-y-3">
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold">Envío</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {displayValue(order.destinatario)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {displayValue(order.empresaEnvio)}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Teléfono</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {displayValue(order.telefonoEnvio)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Celular</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {displayValue(order.celularEnvio)}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold">Dirección de envío</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {displayValue(order.direccionEnvio)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {displayValue(order.coloniaEnvio)}, {displayValue(order.ciudadEnvio)}{" "}
              {displayValue(order.estadoEnvio)}, {displayValue(order.codigoPostalEnvio)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold">Referencias</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {displayValue(order.referenciasEnvio)}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Envío</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {formatCurrency(Number(order.envio || 0))}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Programa bordados</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {formatCurrency(Number(order.programa_bordados || 0))}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">
                Bordado pantalones extras
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {formatCurrency(Number(order.bordado_pantalones_extras || 0))}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Bordado logotipo</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {order.bordado_logotipo ? "Sí" : "No"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
        <p className="text-sm font-semibold text-slate-800 dark:text-white mb-3">Totales</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold">Subtotal</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {formatCurrency(orderTotals.subtotal)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold">Descuento</p>
            <p className="text-sm font-semibold text-rose-500">
              -{formatCurrency(orderTotals.descuentoTotal)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold">IVA</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {formatCurrency(orderTotals.ivaAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold">Flete</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {formatCurrency(orderTotals.flete)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold">Seguro</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {formatCurrency(orderTotals.seguro)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold">Anticipo</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {formatCurrency(orderTotals.anticipo)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold">Saldo pendiente</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {formatCurrency(orderTotals.saldoPendiente)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold">Total</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {formatCurrency(orderTotals.granTotal)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-800 dark:text-white">Items</p>
          <p className="text-xs text-slate-400">{items.length} productos</p>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-white/10">
          {items.map((item, index) => (
            <div key={`${item.productoId}-${index}`} className="py-3 flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">
                    {item.descripcion}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    ID: {item.productoId} · {item.unidad}
                  </p>
                </div>
                <div className="text-sm font-semibold text-slate-800 dark:text-white">
                  {formatCurrency(item.importe)}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-slate-500 dark:text-slate-400">
                <div>Cantidad: {item.cantidad.toLocaleString("es-MX")}</div>
                <div>Precio: {formatCurrency(item.precio)}</div>
                <div>Descuento: {item.descuento}%</div>
                <div>Importe: {formatCurrency(item.importe)}</div>
                <div>
                  Bordado:{" "}
                  {item.bordados?.activo || item.bordados?.especificaciones?.length
                    ? "Sí"
                    : "No"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
