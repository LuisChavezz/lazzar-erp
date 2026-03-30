"use client";

import { getStatusStyles } from "../utils/getStatusStyle";
import { useOrder } from "../hooks/useOrder";
import { OrderDetailsProducts } from "./OrderDetailsProducts";
import {
  formatOrderDateTime,
  getEnabledOptionLabels,
  toCurrencyOrDash,
  toDisplayValue,
} from "../utils/orderDetailsFormatters";

interface OrderDetailsProps {
  orderId: number;
}

export const OrderDetails = ({ orderId }: OrderDetailsProps) => {
  const { data: order, isLoading, isError } = useOrder(orderId);

  if (isLoading) {
    return (
      <div className="space-y-4" role="status" aria-live="polite" aria-label="Cargando detalles del pedido">
        <div className="h-24 rounded-xl bg-slate-200/70 dark:bg-white/10 animate-pulse" />
        <div className="h-56 rounded-xl bg-slate-200/70 dark:bg-white/10 animate-pulse" />
        <div className="h-48 rounded-xl bg-slate-200/70 dark:bg-white/10 animate-pulse" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="rounded-xl border border-rose-200 dark:border-rose-400/30 bg-rose-50 dark:bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-200">
        No se pudieron cargar los detalles del pedido.
      </div>
    );
  }

  const statusClassName = getStatusStyles(order);
  const piezas = order.detalles.reduce( // Sumar de todos los detalles
    (total, detalle) => total + detalle.tallas.reduce((sum, talla) => sum + (Number(talla.cantidad) || 0), 0),
    0
  );
  const canales = getEnabledOptionLabels([
    { label: "Recompra", active: order.recompra },
    { label: "Chat online", active: order.chat_online },
    { label: "Pedido online", active: order.pedido_online },
    { label: "Prospección", active: order.prospeccion },
    { label: "Recomendación", active: order.recomendacion },
    { label: "Amazon", active: order.amazon },
    { label: "Google", active: order.google },
    { label: "Publicidad", active: order.publicidad },
    { label: "Mercado Libre", active: order.mercado_libre },
    { label: "Redes sociales", active: order.redes_sociales },
    { label: "Otro", active: order.otro },
    { label: "Mailing", active: order.mailing },
  ]);
  const condiciones = getEnabledOptionLabels([
    { label: "Anticipo total", active: order.anticipo_total },
    { label: "Anticipo parcial", active: order.anticipo_parcial },
    { label: "Vendedor autoriza", active: order.vendedor_autoriza },
    { label: "Pago antes embarque", active: order.pago_antes_embarque },
    { label: "Por confirmar", active: order.por_confirmar },
    { label: "Otra cantidad", active: order.otra_cantidad },
  ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 bg-white dark:bg-white/5">
          <p className="text-xs uppercase text-slate-400 font-semibold">Estatus</p>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${statusClassName}`}>
            {order.estatus_label}
          </span>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 bg-white dark:bg-white/5">
          <p className="text-xs uppercase text-slate-400 font-semibold">Total</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white mt-2">
            {toCurrencyOrDash(order.gran_total)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 bg-white dark:bg-white/5">
          <p className="text-xs uppercase text-slate-400 font-semibold">Piezas</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white mt-2">
            {piezas}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 bg-white dark:bg-white/5">
          <p className="text-xs uppercase text-slate-400 font-semibold">Fecha</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white mt-2">
            {formatOrderDateTime(order.created_at)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 space-y-4 xl:col-span-2 bg-white dark:bg-white/5">
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold">Cliente</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {toDisplayValue(order.cliente_nombre || order.cliente_razon_social)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {toDisplayValue(order.cliente_razon_social)}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Cotización ID</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {toDisplayValue(order.id)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">ID cliente</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {toDisplayValue(order.cliente)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Uso CFDI</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {toDisplayValue(order.uso_cfdi)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Orden Compra</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {toDisplayValue(order.oc)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Persona pagos</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {toDisplayValue(order.persona_pagos)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Correo facturas</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 break-all">
                {toDisplayValue(order.correo_facturas)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Teléfono pagos</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {toDisplayValue(order.telefono_pagos)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Forma de pago</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {toDisplayValue(order.forma_pago)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Método de pago</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {toDisplayValue(order.metodo_pago)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Moneda ID</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {toDisplayValue(order.moneda)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 space-y-3 bg-white dark:bg-white/5">
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold">Totales</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {toCurrencyOrDash(order.gran_total)}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Autorizada</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {toDisplayValue(formatOrderDateTime(order.autorizada_at))}
              </p>
            </div>
            {/* <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Cambios solicitados</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {toDisplayValue(formatOrderDateTime(order.cambios_solicitados_at))}
              </p>
            </div> */}
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Subtotal</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {toCurrencyOrDash(order.subtotal)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">IVA</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {toDisplayValue(order.iva)}%
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Anticipo</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {toCurrencyOrDash(order.anticipo)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 bg-white dark:bg-white/5">
          <p className="text-xs uppercase text-slate-400 font-semibold mb-3">Origen del pedido</p>
          <div className="flex flex-wrap gap-2">
            {canales.map((canal) => (
              <span
                key={canal}
                className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-slate-200/70 text-slate-700 dark:bg-white/10 dark:text-slate-200"
              >
                {canal}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 bg-white dark:bg-white/5">
          <p className="text-xs uppercase text-slate-400 font-semibold mb-3">Condición de pago</p>
          <div className="flex flex-wrap gap-2">
            {condiciones.map((condicion) => (
              <span
                key={condicion}
                className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-slate-200/70 text-slate-700 dark:bg-white/10 dark:text-slate-200"
              >
                {condicion}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
            Monto: <span className="font-medium text-slate-700 dark:text-slate-300">{toCurrencyOrDash(order.monto)}</span>
          </p>
      </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 bg-white dark:bg-white/5 space-y-3">
          <p className="text-xs uppercase text-slate-400 font-semibold">Datos de envío</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Destinatario</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{toDisplayValue(order.destinatario)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Empresa</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{toDisplayValue(order.empresa_envio)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Teléfono</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{toDisplayValue(order.telefono_envio)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Celular</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{toDisplayValue(order.celular_envio)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Colonia</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{toDisplayValue(order.colonia_envio)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Código postal</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{toDisplayValue(order.codigo_postal)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Ciudad</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{toDisplayValue(order.ciudad_envio)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Estado</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{toDisplayValue(order.estado_envio)}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs uppercase text-slate-400 font-semibold">Dirección</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{toDisplayValue(order.direccion_envio)}</p>
            </div>
            <div className="sm:col-span-3">
              <p className="text-xs uppercase text-slate-400 font-semibold">Referencias</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{toDisplayValue(order.referencias)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 bg-white dark:bg-white/5 space-y-3">
          <p className="text-xs uppercase text-slate-400 font-semibold">Servicios y cargos</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <p className="text-slate-700 dark:text-slate-300">Envío</p>
            <p className="text-right text-slate-800 dark:text-slate-100 font-medium">{toCurrencyOrDash(order.envio)}</p>
            <p className="text-slate-700 dark:text-slate-300">Programa bordados</p>
            <p className="text-right text-slate-800 dark:text-slate-100 font-medium">{toCurrencyOrDash(order.programa_bordados)}</p>
            <p className="text-slate-700 dark:text-slate-300">Bordado pantalones extras</p>
            <p className="text-right text-slate-800 dark:text-slate-100 font-medium">{toCurrencyOrDash(order.bordado_pantalones_extras)}</p>
            <p className="text-slate-700 dark:text-slate-300">Serigrafía</p>
            <p className="text-right text-slate-800 dark:text-slate-100 font-medium">{toCurrencyOrDash(order.serigrafia)}</p>
            <p className="text-slate-700 dark:text-slate-300">Reflejante</p>
            <p className="text-right text-slate-800 dark:text-slate-100 font-medium">{toCurrencyOrDash(order.reflejante)}</p>
            <p className="text-slate-700 dark:text-slate-300">Flete</p>
            <p className="text-right text-slate-800 dark:text-slate-100 font-medium">{toCurrencyOrDash(order.flete)}</p>
            <p className="text-slate-700 dark:text-slate-300">Seguros</p>
            <p className="text-right text-slate-800 dark:text-slate-100 font-medium">{toCurrencyOrDash(order.seguros)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 bg-white dark:bg-white/5">
        <p className="text-xs uppercase text-slate-400 font-semibold mb-3">Detalle de productos</p>
        <OrderDetailsProducts details={order.detalles} />
      </div>
    </div>
  );
};
