"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import {
  EmptyLines,
  InfoField,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { formatMoneyValue } from "@/src/utils/formatCurrency";
import { usePedidoDetail } from "@/src/features/orders/hooks/usePedidoDetail";
import type {
  Order,
  PedidoDetalleLinea,
} from "@/src/features/orders/interfaces/order.interface";

/**
 * Líneas del pedido, agrupadas por producto + color con sus tallas anidadas.
 *
 * NO usa el `LineItemsTable` plano de `DetailDialogPrimitives`: cada línea de
 * `detalles` es una combinación producto+color cuyo desglose vendible (SKU y
 * cantidad por talla) vive un nivel más abajo — aplanarlo perdería justo la
 * parte más útil para preparar un surtido. El patrón visual (tarjeta por
 * grupo: cabecera producto + pastilla de color con swatch, tabla de tallas
 * debajo, siempre expandida) espeja `QuoteDetailsProducts`, la vista ya
 * establecida para esta misma forma de datos, simplificada a lo operativo.
 *
 * `costo_unitario` se omite a propósito (dato de costo/margen interno, no de
 * surtido) — misma convención que `QuoteDetailsProducts`, que tampoco lo
 * pinta; los costos solo se exhiben en los reportes de valuación.
 */
function PedidoLineas({ detalles }: { detalles: PedidoDetalleLinea[] }) {
  if (detalles.length === 0) {
    return <EmptyLines>Este pedido no tiene líneas de producto.</EmptyLines>;
  }

  return (
    <div className="space-y-4">
      {detalles.map((linea) => (
        <div
          key={linea.id}
          className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden"
        >
          {/* ── Cabecera del grupo: producto + color · cantidad total ────── */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {linea.producto_nombre}
                </span>
                {linea.color_nombre && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm">
                    {linea.color_hex && (
                      <span
                        className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/10"
                        style={{ backgroundColor: linea.color_hex }}
                        aria-hidden="true"
                      />
                    )}
                    {linea.color_nombre}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Precio unitario: {formatMoneyValue(linea.precio_unitario)} · Subtotal:{" "}
                {formatMoneyValue(linea.subtotal_linea)}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold tabular-nums text-slate-800 dark:text-white">
                {linea.cantidad_total} pzas
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {linea.tallas.length} talla{linea.tallas.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          {/* ── Tallas: la variante vendible (SKU) y su cantidad ─────────── */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 dark:bg-white/5">
                <tr className="text-slate-500 dark:text-slate-400">
                  <th className="px-3 py-2 text-left font-semibold">Talla</th>
                  <th className="px-3 py-2 text-left font-semibold">SKU</th>
                  <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {linea.tallas.map((talla) => (
                  <tr
                    key={talla.id}
                    className="border-t border-slate-100 dark:border-white/10"
                  >
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                      {talla.talla_nombre}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-500 dark:text-slate-400">
                      {talla.variante_sku || "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                      {talla.cantidad}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

interface PickingOrderDetailDialogProps {
  /** Renglón del listado ya en memoria — da id para el fetch y folio/cliente
   *  para el título mientras el detalle carga. */
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Diálogo apilado de "Ver detalle" del pedido seleccionado en el formulario de
 * picking. Lee `GET /ventas/pedidos/{id}/` directamente (`usePedidoDetail`) —
 * cabecera Y líneas producto+color+tallas, con o sin cotización ligada — en
 * vez del rodeo anterior vía `QuoteDetails`/cotización.
 *
 * Se monta SOLO al abrirse (ver `PickingForm`) y el hook además gatea con
 * `enabled: id > 0`, así que la petición no existe hasta que el usuario pulsa
 * "Ver detalle del pedido" — cero fetch anticipado.
 */
export function PickingOrderDetailDialog({
  order,
  open,
  onOpenChange,
}: PickingOrderDetailDialogProps) {
  const { data, isLoading, isError, error } = usePedidoDetail(order.id);

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="1000px"
      title={
        <DialogHeader
          title={`Detalles del pedido ${order.folio}`}
          subtitle={order.cliente_nombre || order.cliente_razon_social || "Pedido"}
          statusColor="sky"
        />
      }
    >
      {/* ── Estado: cargando ─────────────────────────────────────────────── */}
      {isLoading && <Loader title="Cargando detalle del pedido..." className="py-16" />}

      {/* ── Estado: error ────────────────────────────────────────────────── */}
      {isError && (
        <ErrorState
          title="Error al cargar el detalle del pedido"
          message={(error as Error)?.message}
        />
      )}

      {/* ── Estado: datos cargados ───────────────────────────────────────── */}
      {!isLoading && !isError && data && (
        <div className="space-y-5">
          {/* Resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
            <InfoField label="Cliente" className="col-span-2 sm:col-span-1">
              <span className="block truncate">{textOrDash(data.cliente_nombre)}</span>
            </InfoField>
            <InfoField label="Forma de pago">{textOrDash(data.forma_pago)}</InfoField>
            <InfoField label="Método de pago">{textOrDash(data.metodo_pago)}</InfoField>
            <InfoField label="Uso CFDI">{textOrDash(data.uso_cfdi)}</InfoField>
            <InfoField label="Destinatario">{textOrDash(data.destinatario)}</InfoField>
            <InfoField label="Ciudad envío">{textOrDash(data.ciudad_envio)}</InfoField>
            <InfoField label="Flete">
              <span className="tabular-nums">{formatMoneyValue(data.flete)}</span>
            </InfoField>
            <InfoField label="Gran total" className="col-span-2 sm:col-span-2">
              <span className="tabular-nums font-semibold">
                {formatMoneyValue(data.gran_total)}
              </span>
            </InfoField>
            {data.observaciones && (
              <InfoField label="Observaciones" className="col-span-2 sm:col-span-3">
                {data.observaciones}
              </InfoField>
            )}
          </div>

          {/* Líneas producto + color + tallas */}
          <div>
            <SectionTitle>Detalle de productos</SectionTitle>
            <PedidoLineas detalles={data.detalles} />
          </div>
        </div>
      )}
    </MainDialog>
  );
}
