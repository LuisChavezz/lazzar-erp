"use client";

import { Order } from "../interfaces/order.interface";
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

  const statusClassName = getStatusStyles(order.estatusPedido);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <p className="text-xs uppercase text-slate-400 font-semibold">Estatus</p>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${statusClassName}`}>
            {order.estatusPedido}
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
            {displayValue(order.fecha)}
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
              {displayValue(order.clienteNombre)}
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
                {displayValue(order.usoCfdi)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Orden Compra</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {displayValue(order.ordenCompra)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Forma de pago</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {displayValue(order.formaPago)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Método de pago</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {displayValue(order.metodoPago)}
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
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
        <p className="text-sm font-semibold text-slate-800 dark:text-white mb-3">Totales</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold">Subtotal</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {formatCurrency(order.totals.subtotal)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold">Descuento</p>
            <p className="text-sm font-semibold text-rose-500">
              -{formatCurrency(order.totals.descuentoTotal)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold">IVA</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {formatCurrency(order.totals.ivaAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold">Flete</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {formatCurrency(order.totals.flete)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold">Seguro</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {formatCurrency(order.totals.seguro)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold">Anticipo</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {formatCurrency(order.totals.anticipo)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold">Saldo pendiente</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {formatCurrency(order.totals.saldoPendiente)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold">Total</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {formatCurrency(order.totals.granTotal)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-800 dark:text-white">Items</p>
          <p className="text-xs text-slate-400">{order.items.length} productos</p>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-white/10">
          {order.items.map((item, index) => (
            <div key={`${item.sku}-${index}`} className="py-3 flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">
                    {item.descripcion}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {item.sku} · {item.unidad}
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
